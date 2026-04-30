import { SlashCommandBuilder } from "discord.js";
import { explainCandidate } from "./candidateActions.js";
import { BotCommand } from "./types.js";

export const explainCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("explain")
    .setDescription("Explain why a candidate matched a watch.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true))
    .addStringOption((option) => option.setName("mint").setDescription("Candidate mint address").setRequired(true)),
  async execute(interaction) {
    const response = await explainCandidate(
      interaction.options.getString("watch_id", true),
      interaction.options.getString("mint", true)
    );
    await interaction.reply(response);
  }
};
