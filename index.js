const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

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

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
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

    // Build image using quickchart canvas API
    const canvasCode = `
      ctx.fillStyle = '#2b2d31';
      ctx.fillRect(0, 0, 700, 280);

      async function loadImg(url) {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      }

      const img1 = await loadImg('${donorAvatar}');
      if (img1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(130, 120, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img1, 60, 50, 140, 140);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(130, 120, 75, 0, Math.PI * 2);
      ctx.strokeStyle = '#CC00CC';
      ctx.lineWidth = 6;
      ctx.stroke();

      const img2 = await loadImg('${recipientAvatar}');
      if (img2) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(570, 120, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img2, 500, 50, 140, 140);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(570, 120, 75, 0, Math.PI * 2);
      ctx.strokeStyle = '#CC00CC';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#CC00CC';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('${formattedAmount} Robux', 350, 105);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial';
      ctx.fillText('donated to', 350, 148);

      ctx.fillStyle = '#cccccc';
      ctx.font = '18px Arial';
      ctx.fillText('@${donor}', 130, 215);
      ctx.fillText('@${recipient}', 570, 215);
    `;

    const imageUrl = `https://quickchart.io/canvas?width=700&height=280&code=${encodeURIComponent(canvasCode)}`;

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC)
      .setDescription(`### 🚀 @${donor} donated **${formattedAmount} Robux** to @${recipient}`)
      .setImage(imageUrl)
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` });

    await channel.send({ embeds: [embed] });
    console.log(`Donation logged: ${donor} -> ${recipient} | ${formattedAmount} Robux`);
    res.json({ success: true });
  } catch (err) {
    console.error("Donation error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`Express listening on port ${PORT}`);
});

client.login(BOT_TOKEN);
