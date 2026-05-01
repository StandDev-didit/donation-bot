const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const express = require("express");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const DONATION_LOG_CHANNEL_ID = process.env.CHANNEL_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

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

async function generateDonationImage(donorName, recipientName, amount, donorAvatarUrl, recipientAvatarUrl) {
  const width = 700;
  const height = 280;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#2b2d31";
  ctx.fillRect(0, 0, width, height);

  // Draw circular avatar
  async function drawCircularAvatar(url, cx, cy, size) {
    if (url) {
      try {
        const img = await loadImage(url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
        ctx.restore();
      } catch {}
    }
    // Pink border always
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#CC00CC";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  const avatarSize = 130;
  const avatarY = 115;
  const leftX = 115;
  const rightX = width - 115;

  await drawCircularAvatar(donorAvatarUrl, leftX, avatarY, avatarSize);
  await drawCircularAvatar(recipientAvatarUrl, rightX, avatarY, avatarSize);

  // Robux amount — pink
  ctx.fillStyle = "#CC00CC";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Number(amount).toLocaleString()} Robux`, width / 2, avatarY - 15);

  // "donated to" — white
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("donated to", width / 2, avatarY + 22);

  // Names below avatars
  ctx.fillStyle = "#cccccc";
  ctx.font = "17px sans-serif";
  ctx.fillText(`@${donorName}`, leftX, avatarY + avatarSize / 2 + 35);
  ctx.fillText(`@${recipientName}`, rightX, avatarY + avatarSize / 2 + 35);

  return canvas.toBuffer("image/png");
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

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

app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
});

client.login(BOT_TOKEN);
