const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
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

// Get Roblox avatar URL
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

// Build donation image URL using quickchart.io
function buildDonationImageUrl(donorName, recipientName, amount, donorAvatar, recipientAvatar) {
  const chart = {
    type: "bar",
    data: { labels: [""], datasets: [{ data: [0] }] },
    options: {
      plugins: {
        beforeDraw: "function(chart) { const ctx = chart.ctx; const w = chart.width; const h = chart.height; ctx.fillStyle = '#2b2d31'; ctx.fillRect(0,0,w,h); }"
      }
    }
  };

  const donor = encodeURIComponent(donorAvatar || "");
  const recip = encodeURIComponent(recipientAvatar || "");
  const amt = encodeURIComponent(Number(amount).toLocaleString());
  const dn = encodeURIComponent(donorName);
  const rn = encodeURIComponent(recipientName);

  return `https://quickchart.io/chart?width=700&height=300&backgroundColor=%232b2d31&c=${encodeURIComponent(JSON.stringify({
    type: "outlabeledPie",
    data: { labels: ["a"], datasets: [{ data: [1] }] }
  }))}`;
}

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

    const embed = new EmbedBuilder()
      .setColor(0x9900ff)
      .setAuthor({ name: member.user.username, iconURL: avatarUrl })
      .setThumbnail(avatarUrl)
      .setDescription(`## Welcome to Khaby's Studios!\nWe hope you have a great time here!`)
      .setFooter({ text: `Member joined` })
      .setTimestamp();

    await channel.send({ content: `👋 <@${member.user.id}>`, embeds: [embed] });
  } catch (err) {
    console.error("Welcome error:", err);
  }
});

// Donation endpoint
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
    const imageUrl = `https://quickchart.io/canvas?backgroundColor=%232b2d31&width=700&height=280&code=${encodeURIComponent(`
      // Background
      ctx.fillStyle = '#2b2d31';
      ctx.fillRect(0, 0, 700, 280);

      // Load and draw donor avatar (left)
      const img1 = new Image();
      img1.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(130, 130, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img1, 60, 60, 140, 140);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(130, 130, 74, 0, Math.PI * 2);
        ctx.strokeStyle = '#CC00CC';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = '#CC00CC';
        ctx.lineWidth = 6;
      };
      img1.src = '${donorAvatar}';

      // Load and draw recipient avatar (right)
      const img2 = new Image();
      img2.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(570, 130, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img2, 500, 60, 140, 140);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(570, 130, 74, 0, Math.PI * 2);
        ctx.strokeStyle = '#CC00CC';
        ctx.lineWidth = 6;
        ctx.stroke();
      };
      img2.src = '${recipientAvatar}';

      // Center text
      ctx.fillStyle = '#CC00CC';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('${formattedAmount} Robux', 350, 115);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px Arial';
      ctx.fillText('donated to', 350, 155);

      // Names
      ctx.fillStyle = '#cccccc';
      ctx.font = '18px Arial';
      ctx.fillText('@${donorName}', 130, 220);
      ctx.fillText('@${recipientName}', 570, 220);
    `)}`;

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC)
      .setDescription(`### 🚀 @${donor} donated **${formattedAmount} Robux** to @${recipient}`)
      .setImage(imageUrl)
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` });

    await channel.send({ embeds: [embed] });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`Express listening on port ${PORT}`);
});

client.login(BOT_TOKEN);
