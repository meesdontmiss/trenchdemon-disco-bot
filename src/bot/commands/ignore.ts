import { SlashCommandBuilder } from "discord.js";
import { ignoreCandidate } from "./candidateActions.js";
import { BotCommand } from "./types.js";

export const ignoreCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ignore")
    .setDescription("Ignore a candidate for a watch.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true))
    .addStringOption((option) => option.setName("mint").setDescription("Candidate mint address").setRequired(true)),
  async execute(interaction) {
    const response = await ignoreCandidate(
      interaction.options.getString("watch_id", true),
      interaction.options.getString("mint", true)
    );
    await interaction.reply(response);
  }
};
