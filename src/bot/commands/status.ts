import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { BotCommand } from "./types.js";

export const statusCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show current watch status and best candidate.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true)),
  async execute(interaction) {
    const watchId = interaction.options.getString("watch_id", true);
    const watch = await prisma.narrativeWatch.findUnique({
      where: { id: watchId },
      include: {
        candidates: {
          where: { isIgnored: false },
          orderBy: [{ isPinned: "desc" }, { finalScore: "desc" }],
          take: 1
        },
        _count: { select: { candidates: true } }
      }
    });

    if (!watch) {
      await interaction.reply({ content: "Watch not found.", ephemeral: true });
      return;
    }

    const best = watch.candidates[0];
    await interaction.reply(
      [
        `Status for ${watch.title} (${watch.id})`,
        `State: ${watch.status}`,
        `Candidates: ${watch._count.candidates}`,
        `Best candidate: ${best ? `${best.symbol} - ${Math.round(best.finalScore)}/100` : "None yet"}`,
        `Last scan: ${watch.lastScannedAt?.toISOString() ?? "Not scanned yet"}`
      ].join("\n")
    );
  }
};
