import { SlashCommandBuilder } from "discord.js";
import { archiveWatch } from "./candidateActions.js";
import { BotCommand } from "./types.js";

export const archiveCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("archive")
    .setDescription("Archive a watch without selecting a final candidate.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true)),
  async execute(interaction) {
    const response = await archiveWatch(interaction, interaction.options.getString("watch_id", true));
    await interaction.reply(response);
  }
};
