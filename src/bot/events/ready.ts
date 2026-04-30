import { Client, Events } from "discord.js";
import { logger } from "../../utils/logger.js";

export const readyEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client): void {
    logger.info({ user: client.user?.tag }, "discord bot ready");
  }
};
