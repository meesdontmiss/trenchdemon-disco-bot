import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { candidateEmbed } from "../../discord/embeds/candidateEmbed.js";
import { BotCommand } from "./types.js";

export const candidatesCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("candidates")
    .setDescription("Show ranked candidates for a narrative watch.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true)),
  async execute(interaction) {
    const watchId = interaction.options.getString("watch_id", true);
    const watch = await prisma.narrativeWatch.findUnique({
      where: { id: watchId },
      include: {
        candidates: {
          where: { isIgnored: false },
          orderBy: [{ isPinned: "desc" }, { finalScore: "desc" }],
          take: 5
        }
      }
    });

    if (!watch) {
      await interaction.reply({ content: "Watch not found.", ephemeral: true });
      return;
    }

    if (!watch.candidates.length) {
      await interaction.reply(`No candidates found yet for ${watch.title}.`);
      return;
    }

    const top = watch.candidates[0];
    if (!top) {
      await interaction.reply(`No candidates found yet for ${watch.title}.`);
      return;
    }
    const content = watch.candidates
      .map((candidate, index) => `${index + 1}. ${candidate.symbol} - ${Math.round(candidate.finalScore)}/100 - ${candidate.mintAddress}`)
      .join("\n");

    await interaction.reply({
      content,
      embeds: [candidateEmbed(top, watch)],
      components: [candidateActionRow(watch.id, top.mintAddress)]
    });
  }
};

export function candidateActionRow(watchId: string, mint: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`pin:${watchId}:${mint}`).setLabel("Pin").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ignore:${watchId}:${mint}`).setLabel("Ignore").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`explain:${watchId}:${mint}`).setLabel("Explain").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`conclude:${watchId}:${mint}`).setLabel("Conclude").setStyle(ButtonStyle.Success)
  );
}
