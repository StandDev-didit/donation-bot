const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

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
async function getRobloxAvatar(userId) {
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

    // Fetch real avatar URLs from Roblox
    const donorAvatar = await getRobloxAvatar(donorId);
    const recipientAvatar = await getRobloxAvatar(recipientId);

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC)
      .setDescription(
        `### 🚀 @${donor} donated 🔵 **${Number(amount).toLocaleString()} Robux** to @${recipient}\n\n` +
        `🔵 **${Number(amount).toLocaleString()}**\n**donated to**`
      )
      .setThumbnail(donorAvatar)
      .setImage(recipientAvatar)
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` });

    await channel.send({ embeds: [embed] });
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
