import { archiveCommand } from "./archive.js";
import { bestCommand } from "./best.js";
import { candidatesCommand } from "./candidates.js";
import { concludeCommand } from "./conclude.js";
import { explainCommand } from "./explain.js";
import { ignoreCommand } from "./ignore.js";
import { pinCommand } from "./pin.js";
import { statusCommand } from "./status.js";
import { trackCommand } from "./track.js";
import { BotCommand } from "./types.js";
import { watchlistCommand } from "./watchlist.js";

export const commands: BotCommand[] = [
  trackCommand,
  candidatesCommand,
  bestCommand,
  explainCommand,
  ignoreCommand,
  pinCommand,
  concludeCommand,
  archiveCommand,
  watchlistCommand,
  statusCommand
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
