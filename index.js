const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const express = require("express");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");
const fs = require("fs");

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

// Load font from repo
const FONT_PATH = path.join(__dirname, "font.ttf");
let FONT = "Arial";
if (fs.existsSync(FONT_PATH)) {
  GlobalFonts.registerFromPath(FONT_PATH, "CustomFont");
  FONT = "CustomFont";
  console.log("✅ Font loaded from repo!");
} else {
  console.log("⚠️ font.ttf not found, using fallback");
}

async function getRobloxAvatarUrl(userId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
    );
    const json = await res.json();
    return json?.data?.[0]?.imageUrl || null;
  } catch {
    return null;
  }
}

async function generateDonationImage(donorName, recipientName, amount, donorAvatarUrl, recipientAvatarUrl) {
  const width = 700;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#2b2d31";
  ctx.fillRect(0, 0, width, height);

  const avatarSize = 130;
  const avatarCY = 135;
  const leftCX = 120;
  const rightCX = width - 120;

  // Draw donor avatar left
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

  // Draw recipient avatar right
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

  // Amount text - pink
  ctx.fillStyle = "#CC00CC";
  ctx.font = `bold 42px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`${Number(amount).toLocaleString()} Robux`, width / 2, avatarCY - 12);

  // "donated to" - white
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText("donated to", width / 2, avatarCY + 30);

  // Names below avatars
  ctx.fillStyle = "#cccccc";
  ctx.font = `18px ${FONT}`;
  ctx.fillText(`@${donorName}`, leftCX, avatarCY + avatarSize / 2 + 35);
  ctx.fillText(`@${recipientName}`, rightCX, avatarCY + avatarSize / 2 + 35);

  return canvas.toBuffer("image/png");
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("guildMemberAdd", async (member) => {
  if (!WELCOME_CHANNEL_ID) return;
  try {
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel) return;
    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const embed = new EmbedBuilder()
      .setColor(0x9900ff)
      .setAuthor({ name: member.user.username, iconURL: avatarUrl })
      .setThumbnail(avatarUrl)
      .setDescription(`## Welcome to Khaby's Studios!\nWe hope you have a great time here!`)
      .setTimestamp();
    await channel.send({ content: `👋 <@${member.user.id}>`, embeds: [embed] });
  } catch (err) {
    console.error("Welcome error:", err);
  }
});

app.post("/donation", async (req, res) => {
  const { secret, donor, recipient, amount, donorId, recipientId } = req.body;

  if (secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const channel = await client.channels.fetch(DONATION_LOG_CHANNEL_ID);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const donorAvatar = await getRobloxAvatarUrl(donorId);
    const recipientAvatar = await getRobloxAvatarUrl(recipientId);
    const formattedAmount = Number(amount).toLocaleString();

    const imageBuffer = await generateDonationImage(donor, recipient, amount, donorAvatar, recipientAvatar);
    const attachment = new AttachmentBuilder(imageBuffer, { name: "donation.png" });

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC)
      .setDescription(`### 🚀 @${donor} donated **${formattedAmount} Robux** to @${recipient}`)
      .setImage("attachment://donation.png")
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` });

    await channel.send({ embeds: [embed], files: [attachment] });
    console.log(`✅ Donation logged: ${donor} -> ${recipient} | ${formattedAmount} Robux`);
    res.json({ success: true });
  } catch (err) {
    console.error("Donation error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Express listening on port ${PORT}`);
});

client.login(BOT_TOKEN);
