const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();
app.use(express.json());

// =============================================
//   CONFIG — fill these in before running
// =============================================
const BOT_TOKEN = "MTQ5OTc4NTg3NDEzNTg0Mjk3NQ.GOLuDM.V8KGSLJgfY8YIJzX6uYMfqwWSrxuA2-b8fTm18";
const DONATION_LOG_CHANNEL_ID = "YOUR_CHANNEL_ID_HERE";
const WEBHOOK_SECRET = "YOUR_SECRET_KEY_HERE"; // Must match Roblox script
const PORT = 3000;
// =============================================

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Roblox will POST to this endpoint
app.post("/donation", async (req, res) => {
  const { secret, donor, recipient, amount, donorAvatar, recipientAvatar } = req.body;

  // Basic auth check
  if (secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const channel = await client.channels.fetch(DONATION_LOG_CHANNEL_ID);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const embed = new EmbedBuilder()
      .setColor(0xCC00CC) // Magenta/pink like Hazem's
      .setDescription(`## 🚀 @${donor} donated 🔵 **${amount.toLocaleString()} Robux** to @${recipient}`)
      .addFields(
        {
          name: "\u200B",
          value: `**From:** @${donor}\n**To:** @${recipient}\n**Amount:** 🔵 ${amount.toLocaleString()} Robux`,
          inline: false,
        }
      )
      .setThumbnail(donorAvatar || null)
      .setImage(recipientAvatar || null)
      .setFooter({ text: `Donated on • ${new Date().toLocaleString()}` })
      .setTimestamp();

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
