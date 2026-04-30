import { Events, Interaction } from "discord.js";
import { commandMap } from "../commands/index.js";
import { concludeCandidate, explainCandidate, ignoreCandidate, pinCandidate } from "../commands/candidateActions.js";
import { isRateLimited } from "../../utils/rateLimit.js";
import { logger } from "../../utils/logger.js";

export const interactionCreateEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        const key = `${interaction.guildId ?? "dm"}:${interaction.user.id}:${interaction.commandName}`;
        if (isRateLimited(key)) {
          await interaction.reply({ content: "Slow down and try again in a few seconds.", ephemeral: true });
          return;
        }

        const command = commandMap.get(interaction.commandName);
        if (!command) {
          await interaction.reply({ content: "Unknown command.", ephemeral: true });
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const [action, watchId, mint] = interaction.customId.split(":");
        if (!action || !watchId || !mint) {
          await interaction.reply({ content: "Invalid action.", ephemeral: true });
          return;
        }

        const key = `${interaction.guildId ?? "dm"}:${interaction.user.id}:${action}`;
        if (isRateLimited(key)) {
          await interaction.reply({ content: "Slow down and try again in a few seconds.", ephemeral: true });
          return;
        }

        if (action === "pin") {
          await interaction.reply(await pinCandidate(watchId, mint));
          return;
        }
        if (action === "ignore") {
          await interaction.reply(await ignoreCandidate(watchId, mint));
          return;
        }
        if (action === "explain") {
          await interaction.reply(await explainCandidate(watchId, mint));
          return;
        }
        if (action === "conclude") {
          await interaction.reply(await concludeCandidate(interaction, watchId, mint));
          return;
        }

        await interaction.reply({ content: "Unknown action.", ephemeral: true });
      }
    } catch (error) {
      logger.error({ err: error }, "interaction failed");
      const response = { content: "Command failed. Check bot logs for details.", ephemeral: true };
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(response).catch(() => undefined);
        } else {
          await interaction.reply(response).catch(() => undefined);
        }
      }
    }
  }
};
