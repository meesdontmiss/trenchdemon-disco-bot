import { CoinCandidate, NarrativeWatch } from "@prisma/client";
import { EmbedBuilder } from "discord.js";
import { formatScore, truncate } from "./format.js";

export function finalSummaryEmbed(watch: NarrativeWatch, candidate?: CoinCandidate | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Search Concluded: ${watch.title}`)
    .setColor(0x3498db)
    .setDescription(truncate(watch.summary, 800))
    .addFields(
      { name: "Watch ID", value: watch.id, inline: true },
      { name: "Final Mint", value: watch.finalMintAddress ?? "None selected", inline: false }
    )
    .setFooter({ text: "Final selection was manual." })
    .setTimestamp(watch.concludedAt ?? new Date());

  if (candidate) {
    embed.addFields(
      { name: "Final Selected Candidate", value: `${candidate.name} (${candidate.symbol})`, inline: true },
      { name: "Score At Conclusion", value: formatScore(candidate.finalScore), inline: true },
      { name: "Reason", value: truncate(candidate.matchExplanation, 700), inline: false }
    );
    if (candidate.pumpUrl) {
      embed.setURL(candidate.pumpUrl);
    }
  }

  return embed;
}
