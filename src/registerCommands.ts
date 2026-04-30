import { REST, Routes } from "discord.js";
import { commands } from "./bot/commands/index.js";
import { env } from "./utils/env.js";
import { logger } from "./utils/logger.js";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
const body = commands.map((command) => command.data.toJSON());

if (env.DISCORD_GUILD_ID) {
  await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), { body });
  logger.info({ guildId: env.DISCORD_GUILD_ID, count: body.length }, "registered guild commands");
} else {
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
  logger.info({ count: body.length }, "registered global commands");
}
