import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { BotCommand } from "./types.js";

export const watchlistCommand: BotCommand = {
  data: new SlashCommandBuilder().setName("watchlist").setDescription("List active narrative watches."),
  async execute(interaction) {
    const watches = await prisma.narrativeWatch.findMany({
      where: {
        status: "ACTIVE",
        discordGuildId: interaction.guildId ?? "dm"
      },
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    if (!watches.length) {
      await interaction.reply("No active narrative watches.");
      return;
    }

    await interaction.reply(
      watches.map((watch) => `${watch.id} - ${watch.title} - ${watch._count.candidates} candidates`).join("\n")
    );
  }
};
