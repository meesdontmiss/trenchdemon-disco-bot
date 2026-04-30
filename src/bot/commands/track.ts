import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { narrativeEmbed } from "../../discord/embeds/narrativeEmbed.js";
import { activeNarrativeCount } from "../../jobs/updateNarratives.js";
import { extractNarrative } from "../../narratives/narrativeExtractor.js";
import { inferSource, extractReadableInput } from "../../utils/urls.js";
import { env } from "../../utils/env.js";
import { BotCommand } from "./types.js";

export const trackCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("track")
    .setDescription("Create a narrative watch from a link or raw story text.")
    .addStringOption((option) =>
      option.setName("input").setDescription("URL, headline, or raw narrative text").setRequired(true).setMaxLength(2000)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const activeCount = await activeNarrativeCount();
    if (activeCount >= env.MAX_ACTIVE_WATCHES) {
      await interaction.editReply(`Maximum active watch count reached (${env.MAX_ACTIVE_WATCHES}). Archive or conclude one first.`);
      return;
    }

    const rawInput = interaction.options.getString("input", true).trim();
    const source = inferSource(rawInput);
    const readableInput = await extractReadableInput(rawInput).catch(() => rawInput);
    const extraction = await extractNarrative(readableInput);

    const watch = await prisma.narrativeWatch.create({
      data: {
        discordGuildId: interaction.guildId ?? "dm",
        discordChannelId: interaction.channelId,
        createdByUserId: interaction.user.id,
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        rawInput,
        title: extraction.title,
        summary: extraction.summary,
        entities: extraction.entities,
        keywords: [...extraction.keywords, ...extraction.alternate_keywords],
        possibleTickers: extraction.possible_tickers,
        negativeKeywords: extraction.negative_keywords
      }
    });

    await interaction.editReply({
      embeds: [narrativeEmbed(watch)],
      content: "Status: Watching Pump.fun for new bonding-curve launches."
    });
  }
};
