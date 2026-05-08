import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { jsonArray } from "../../narratives/narrativeScorer.js";
import { uniqueStrings } from "../../narratives/keywordGenerator.js";
import { BotCommand } from "./types.js";

export const addKeywordsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("addkeywords")
    .setDescription("Add extra keywords or tickers to an existing narrative watch.")
    .addStringOption((option) =>
      option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("keywords")
        .setDescription("Comma-separated keywords to add (e.g. pepe,frog,wojak)")
        .setRequired(false)
        .setMaxLength(500)
    )
    .addStringOption((option) =>
      option
        .setName("tickers")
        .setDescription("Comma-separated tickers to add (e.g. PEPE,WIF,BONK)")
        .setRequired(false)
        .setMaxLength(200)
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const watchId = interaction.options.getString("watch_id", true);
    const keywordsRaw = interaction.options.getString("keywords");
    const tickersRaw = interaction.options.getString("tickers");

    const newKeywords = keywordsRaw
      ? keywordsRaw.split(",").map((k) => k.trim()).filter((k) => k.length >= 2)
      : [];
    const newTickers = tickersRaw
      ? tickersRaw.split(",").map((t) => t.trim().toUpperCase()).filter((t) => t.length >= 2)
      : [];

    if (!newKeywords.length && !newTickers.length) {
      await interaction.editReply("Provide at least one keyword or ticker.");
      return;
    }

    const watch = await prisma.narrativeWatch.findUnique({ where: { id: watchId } });
    if (!watch) {
      await interaction.editReply("Watch not found.");
      return;
    }

    const existingKeywords = jsonArray(watch.keywords);
    const existingTickers = jsonArray(watch.possibleTickers);

    await prisma.narrativeWatch.update({
      where: { id: watchId },
      data: {
        keywords: uniqueStrings([...existingKeywords, ...newKeywords], 60),
        possibleTickers: uniqueStrings([...existingTickers, ...newTickers], 20)
      }
    });

    const lines: string[] = [`**Watch updated:** \`${watch.title}\``];
    if (newKeywords.length) lines.push(`Keywords added: ${newKeywords.join(", ")}`);
    if (newTickers.length) lines.push(`Tickers added: ${newTickers.join(", ")}`);
    await interaction.editReply(lines.join("\n"));
  }
};
