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
    )
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("Override the auto-detected title (used for exact-name matching)")
        .setRequired(false)
        .setMaxLength(120)
    )
    .addStringOption((option) =>
      option
        .setName("keywords")
        .setDescription("Extra keywords to add, comma-separated (e.g. doge,moon,wojak)")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addStringOption((option) =>
      option
        .setName("image")
        .setDescription("URL of a reference image — bot will extract visual keywords from it")
        .setRequired(false)
        .setMaxLength(500)
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const activeCount = await activeNarrativeCount();
    if (activeCount >= env.MAX_ACTIVE_WATCHES) {
      await interaction.editReply(`Maximum active watch count reached (${env.MAX_ACTIVE_WATCHES}). Archive or conclude one first.`);
      return;
    }

    const rawInput = interaction.options.getString("input", true).trim();
    const titleOverride = interaction.options.getString("title")?.trim() || undefined;
    const imageUrl = interaction.options.getString("image")?.trim() || undefined;
    const extraKeywordsRaw = interaction.options.getString("keywords");
    const extraKeywords = extraKeywordsRaw
      ? extraKeywordsRaw
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length >= 2)
      : [];

    const source = inferSource(rawInput);
    const readableInput = await extractReadableInput(rawInput).catch(() => rawInput);
    const extraction = await extractNarrative(readableInput, { imageUrl, titleOverride, extraKeywords });

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
        negativeKeywords: extraction.negative_keywords,
        imageMatchUrl: imageUrl
      }
    });

    await interaction.editReply({
      embeds: [narrativeEmbed(watch)],
      content: `Status: Watching Pump.fun for new bonding-curve launches.${imageUrl ? " 🖼 Visual keywords extracted from reference image." : ""}${extraKeywords.length ? ` Extra keywords added: ${extraKeywords.join(", ")}.` : ""}`
    });
  }
};
