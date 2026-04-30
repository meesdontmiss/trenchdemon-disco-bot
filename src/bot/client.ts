import { Client, Events, GatewayIntentBits } from "discord.js";
import { interactionCreateEvent } from "./events/interactionCreate.js";
import { readyEvent } from "./events/ready.js";

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once(Events.ClientReady, readyEvent.execute);
  client.on(Events.InteractionCreate, interactionCreateEvent.execute);

  return client;
}
