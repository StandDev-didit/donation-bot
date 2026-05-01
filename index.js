const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const express = require("express");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.use(express.json());

// =============================================
//   CONFIG
// =============================================
const BOT_TOKEN = process.env.BOT_TOKEN;
const DONATION_LOG_CHANNEL_ID = process.env.CHANNEL_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;
// =============================================

// Fetch real avatar image URL from Roblox API
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

// Generate merged donation image like Hazem's
async function generateDonationImage(donorName, recipientName, amount, donorAvatarUrl, recipientAvatarUrl) {
  const width = 800;
  const height = 220;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#2b2d31";
  ctx.fillRect(0, 0, width, height);

  // Pink left border
  ctx.fillStyle = "#CC00CC";
  ctx.fillRect(0, 0, 6, height);

  // Draw circular avatar helper
  async function drawCircularAvatar(url, x, y, size) {
    try {
      const img = await loadImage(url);
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, x, y, size, size);
      ctx.restore();

      // Pink circle border
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#CC00CC";
      ctx.lineWidth = 4;
      ctx.stroke();
    } catch {
      // fallback circle if avatar fails
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#555";
      ctx.fill();
      ctx.strokeStyle = "#CC00CC";
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  const avatarSize = 120;
  const avatarY = (height - avatarSize) / 2;

  // Draw donor avatar (left)
  if (donorAvatarUrl) await drawCircularAvatar(donorAvatarUrl, 40, avatarY, avatarSize);

  // Draw recipient avatar (right)
  if (recipientAvatarUrl) await drawCircularAvatar(recipientAvatarUrl, width - 40 - avatarSize, avatarY, avatarSize);

  // Center text — Robux amount
  ctx.fillStyle = "#CC00CC";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🔵 ${Number(amount).toLocaleString()}`, width / 2, height / 2 - 10);

  // Center text — "donated to"
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("donated to", width / 2, height / 2 + 25);

  // Donor name below left avatar
  ctx.fillStyle = "#cccccc";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`@${donorName}`, 40 + avatarSize / 2, avatarY + avatarSize + 20);

  // Recipient name below right avatar
  ctx.fillText(`@${recipientName}`, width - 40 - avatarSize / 2, avatarY + avatarSize + 20);

  return canvas.toBuffer("image/png");
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

app.post("/donation", async (req, res) => {
  const { secret, donor, recipient, amount, donorId, recipientId } = req.body;

  if (secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const channel = await client.channels.fetch(DONATION_LOG_CHANNEL_ID);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    // Fetch avatar URLs
    const donorAvatarUrl = await getRobloxAvatarUrl(donorId);
    const recipientAvatarUrl = await getRobloxAvatarUrl(recipientId);

    // Generate merged image
    const imageBuffer = await generateDonationImage(donor, recipient, amount, donorAvatarUrl, recipientAvatarUrl);
    const attachment = new AttachmentBuilder(imageBuffer, { name: "donation.png" });

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC)
      .setDescription(`### 🚀 @${donor} donated 🔵 **${Number(amount).toLocaleString()} Robux** to @${recipient}`)
      .setImage("attachment://donation.png")
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` });

    await channel.send({ embeds: [embed], files: [attachment] });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Express server listening on port ${PORT}`);
});

client.login(BOT_TOKEN);
