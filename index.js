const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const express = require("express");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const downloadFont = require("./downloadFont");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DONATION_LOG_CHANNEL_ID = process.env.CHANNEL_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

let fontFamily = "sans-serif";

// =============================================
//   ROBLOX AVATAR FETCHER
// =============================================
async function getRobloxAvatarUrl(userId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`
    );
    const json = await res.json();
    return json?.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

// =============================================
//   DONATION IMAGE GENERATOR
// =============================================
async function generateDonationImage(donorName, recipientName, amount, donorAvatarUrl, recipientAvatarUrl) {
  const width = 700;
  const height = 320;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#2b2d31";
  ctx.fillRect(0, 0, width, height);

  const avatarSize = 130;
  const avatarCY = 140;
  const leftCX = 120;
  const rightCX = width - 120;

  // Donor avatar
  if (donorAvatarUrl) {
    try {
      const img = await loadImage(donorAvatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(leftCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, leftCX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();
    } catch {}
  }
  ctx.beginPath();
  ctx.arc(leftCX, avatarCY, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#CC00CC";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Recipient avatar
  if (recipientAvatarUrl) {
    try {
      const img = await loadImage(recipientAvatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(rightCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, rightCX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();
    } catch {}
  }
  ctx.beginPath();
  ctx.arc(rightCX, avatarCY, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = "#CC00CC";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Text on top
  ctx.fillStyle = "#DD00DD";
  ctx.font = `bold 38px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${Number(amount).toLocaleString()} Robux`, width / 2, avatarCY - 10);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 26px ${fontFamily}`;
  ctx.fillText("donated to", width / 2, avatarCY + 30);

  ctx.fillStyle = "#cccccc";
  ctx.font = `18px ${fontFamily}`;
  ctx.fillText(`@${donorName}`, leftCX, avatarCY + avatarSize / 2 + 35);
  ctx.fillText(`@${recipientName}`, rightCX, avatarCY + avatarSize / 2 + 35);

  return canvas.toBuffer("image/png");
}

// =============================================
//   WELCOME IMAGE GENERATOR
// =============================================
async function generateWelcomeImage(username, avatarUrl) {
  const width = 700;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Purple gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#1a0033");
  gradient.addColorStop(0.5, "#2d0057");
  gradient.addColorStop(1, "#0d0020");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // x and o pattern overlay
  ctx.fillStyle = "rgba(150, 0, 255, 0.08)";
  ctx.font = `14px ${fontFamily}`;
  for (let row = 20; row < height; row += 22) {
    for (let col = 0; col < width; col += 22) {
      ctx.fillText(Math.random() > 0.5 ? "x" : "o", col, row);
    }
  }

  // Purple glow bottom right
  const glow = ctx.createRadialGradient(width, height, 0, width, height, 300);
  glow.addColorStop(0, "rgba(120, 0, 255, 0.4)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // "Khaby's Studios" watermark
  ctx.save();
  ctx.fillStyle = "rgba(180, 100, 255, 0.18)";
  ctx.font = `bold 65px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-0.18);
  ctx.fillText("Khaby's Studios", 0, 0);
  ctx.restore();

  // Avatar
  const avatarSize = 110;
  const avatarCX = 105;
  const avatarCY = height / 2;

  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, avatarCX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
      ctx.restore();
    } catch {}
  }
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = "#9900ff";
  ctx.lineWidth = 5;
  ctx.stroke();

  // Welcome text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 26px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`Welcome to Khaby's Studios!`, 185, height / 2 - 12);

  ctx.fillStyle = "#bbbbbb";
  ctx.font = `17px ${fontFamily}`;
  ctx.fillText(`We hope you have a great time here!`, 185, height / 2 + 20);

  return canvas.toBuffer("image/png");
}

// =============================================
//   DISCORD EVENTS
// =============================================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Welcome new members
client.on("guildMemberAdd", async (member) => {
  if (!WELCOME_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const imageBuffer = await generateWelcomeImage(member.user.username, avatarUrl);
    const attachment = new AttachmentBuilder(imageBuffer, { name: "welcome.png" });

    const embed = new EmbedBuilder()
      .setColor(0x9900ff)
      .setAuthor({ name: `Welcome to Khaby's Studios!`, iconURL: avatarUrl })
      .setDescription(`We hope you have a great time here!`)
      .setImage("attachment://welcome.png");

    await channel.send({ content: `👋 @${member.user.username}`, embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error("Welcome error:", err);
  }
});

// =============================================
//   DONATION ENDPOINT
// =============================================
app.post("/donation", async (req, res) => {
  const { secret, donor, recipient, amount, donorId, recipientId } = req.body;

  if (secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const channel = await client.channels.fetch(DONATION_LOG_CHANNEL_ID);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const donorAvatarUrl = await getRobloxAvatarUrl(donorId);
    const recipientAvatarUrl = await getRobloxAvatarUrl(recipientId);

    const imageBuffer = await generateDonationImage(donor, recipient, amount, donorAvatarUrl, recipientAvatarUrl);
    const attachment = new AttachmentBuilder(imageBuffer, { name: "donation.png" });

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC)
      .setDescription(`### 🚀 @${donor} donated **${Number(amount).toLocaleString()} Robux** to @${recipient}`)
      .setImage("attachment://donation.png")
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` });

    await channel.send({ embeds: [embed], files: [attachment] });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

// =============================================
//   START
// =============================================
async function start() {
  const fontPath = await downloadFont();
  if (fontPath) {
    GlobalFonts.registerFromPath(fontPath, "CustomFont");
    fontFamily = "CustomFont";
    console.log("Font loaded!");
  } else {
    console.log("Using fallback font");
  }

  app.listen(PORT, () => console.log(`Express listening on port ${PORT}`));
  client.login(BOT_TOKEN);
}

start();
