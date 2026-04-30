import { SlashCommandBuilder } from "discord.js";
import { pinCandidate } from "./candidateActions.js";
import { BotCommand } from "./types.js";

export const pinCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("pin")
    .setDescription("Pin a candidate to the top of a watch.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true))
    .addStringOption((option) => option.setName("mint").setDescription("Candidate mint address").setRequired(true)),
  async execute(interaction) {
    const response = await pinCandidate(
      interaction.options.getString("watch_id", true),
      interaction.options.getString("mint", true)
    );
    await interaction.reply(response);
  }
};
