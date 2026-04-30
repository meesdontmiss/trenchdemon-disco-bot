import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { candidateEmbed } from "../../discord/embeds/candidateEmbed.js";
import { BotCommand } from "./types.js";

export const bestCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("best")
    .setDescription("Show the current top-ranked candidate for a watch.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true)),
  async execute(interaction) {
    const watchId = interaction.options.getString("watch_id", true);
    const watch = await prisma.narrativeWatch.findUnique({
      where: { id: watchId },
      include: {
        candidates: {
          where: { isIgnored: false, isGraduated: false },
          orderBy: [{ isPinned: "desc" }, { finalScore: "desc" }],
          take: 1
        }
      }
    });
    const candidate = watch?.candidates[0];
    if (!watch || !candidate) {
      await interaction.reply({ content: "No active candidate found for that watch.", ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [candidateEmbed(candidate, watch)] });
  }
};
