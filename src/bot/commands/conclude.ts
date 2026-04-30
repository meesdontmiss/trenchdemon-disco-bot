import { SlashCommandBuilder } from "discord.js";
import { concludeCandidate } from "./candidateActions.js";
import { BotCommand } from "./types.js";

export const concludeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("conclude")
    .setDescription("Manually conclude a narrative watch with a final selected candidate.")
    .addStringOption((option) => option.setName("watch_id").setDescription("Narrative watch ID").setRequired(true))
    .addStringOption((option) => option.setName("mint").setDescription("Candidate mint address").setRequired(true)),
  async execute(interaction) {
    const response = await concludeCandidate(
      interaction,
      interaction.options.getString("watch_id", true),
      interaction.options.getString("mint", true)
    );
    await interaction.reply(response);
  }
};
