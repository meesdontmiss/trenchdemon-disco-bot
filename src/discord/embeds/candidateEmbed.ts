import { CoinCandidate, NarrativeWatch } from "@prisma/client";
import { EmbedBuilder } from "discord.js";
import { formatPercent, formatScore, formatUsd, jsonStringArray, shortList, truncate } from "./format.js";

export function candidateEmbed(candidate: CoinCandidate, watch?: NarrativeWatch): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${candidate.name} (${candidate.symbol})`)
    .setColor(candidate.isPinned ? 0xf1c40f : candidate.finalScore >= 70 ? 0x2ecc71 : 0x5865f2)
    .setDescription(truncate(candidate.matchExplanation, 900))
    .addFields(
      { name: "Mint Address", value: candidate.mintAddress, inline: false },
      { name: "Score", value: formatScore(candidate.finalScore), inline: true },
      { name: "Bonding", value: formatPercent(candidate.bondingCurveProgress), inline: true },
      { name: "Market Cap", value: formatUsd(candidate.marketCapUsd), inline: true },
      { name: "Status", value: candidate.state, inline: true },
      { name: "Matched Keywords", value: shortList(jsonStringArray(candidate.matchKeywords)), inline: false },
      { name: "Risk Flags", value: shortList(jsonStringArray(candidate.riskFlags), "None flagged"), inline: false }
    )
    .setFooter({ text: "Candidate ranking is research support, not financial advice." })
    .setTimestamp(candidate.lastUpdatedAt);

  if (watch) {
    embed.addFields({ name: "Narrative", value: `${watch.title} (${watch.id})`, inline: false });
  }
  if (candidate.pumpUrl) {
    embed.setURL(candidate.pumpUrl);
  }
  if (candidate.imageUrl) {
    embed.setThumbnail(candidate.imageUrl);
  }

  return embed;
}
