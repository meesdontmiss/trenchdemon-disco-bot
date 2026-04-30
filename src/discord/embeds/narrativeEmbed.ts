import { CoinCandidate, NarrativeWatch } from "@prisma/client";
import { EmbedBuilder } from "discord.js";
import { formatScore, jsonStringArray, shortList, truncate } from "./format.js";

export function narrativeEmbed(watch: NarrativeWatch, candidates: CoinCandidate[] = []): EmbedBuilder {
  const best = candidates
    .filter((candidate) => !candidate.isIgnored && !candidate.isGraduated)
    .sort((a, b) => b.finalScore - a.finalScore)[0];

  return new EmbedBuilder()
    .setTitle(`Tracking Narrative: ${watch.title}`)
    .setColor(watch.status === "ACTIVE" ? 0x2ecc71 : watch.status === "CONCLUDED" ? 0x3498db : 0x95a5a6)
    .setDescription(truncate(watch.summary, 700))
    .addFields(
      { name: "Watch ID", value: watch.id, inline: true },
      { name: "Status", value: watch.status, inline: true },
      { name: "Candidate Count", value: String(candidates.length), inline: true },
      {
        name: "Keywords",
        value: truncate(shortList(jsonStringArray(watch.keywords))),
        inline: false
      },
      {
        name: "Possible Tickers",
        value: shortList(jsonStringArray(watch.possibleTickers)),
        inline: false
      },
      {
        name: "Best Current Candidate",
        value: best ? `${best.symbol} - ${formatScore(best.finalScore)}` : "None yet",
        inline: false
      }
    )
    .setFooter({ text: "Watching Pump.fun bonding-curve launches. Human review required." })
    .setTimestamp(watch.updatedAt);
}
