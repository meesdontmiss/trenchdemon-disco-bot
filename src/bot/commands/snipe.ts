import { SlashCommandBuilder } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { env } from "../../utils/env.js";
import { sniper } from "../../sniper/sniperService.js";
import { BotCommand } from "./types.js";

export const snipeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("View sniper status, wallet info, or recent snipe orders.")
    .addSubcommandGroup((group) =>
      group
        .setName("wallet")
        .setDescription("Snipe wallet commands")
        .addSubcommand((sub) =>
          sub.setName("info").setDescription("Show snipe wallet address and SOL balance")
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("orders")
        .setDescription("Snipe order history")
        .addSubcommand((sub) =>
          sub
            .setName("list")
            .setDescription("List recent snipe orders")
            .addStringOption((o) =>
              o.setName("watch_id").setDescription("Filter by narrative watch ID").setRequired(false)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("config")
        .setDescription("Show current sniper configuration")
        .addSubcommand((sub) => sub.setName("show").setDescription("Show sniper settings"))
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(true);
    const sub = interaction.options.getSubcommand(true);

    if (group === "wallet" && sub === "info") {
      await interaction.deferReply({ ephemeral: true });
      if (!sniper.isEnabled()) {
        await interaction.editReply(
          `Sniper is **disabled**. Set \`SNIPE_ENABLED=true\` and \`SNIPE_WALLET_PRIVATE_KEY\` in your .env to activate.`
        );
        return;
      }
      const info = await sniper.getWalletInfo();
      if (!info) {
        await interaction.editReply("Wallet not configured — check `SNIPE_WALLET_PRIVATE_KEY`.");
        return;
      }
      await interaction.editReply(
        `**Snipe Wallet**\nAddress: \`${info.address}\`\nBalance: **${info.balanceSol.toFixed(4)} SOL**`
      );
      return;
    }

    if (group === "orders" && sub === "list") {
      await interaction.deferReply({ ephemeral: true });
      const watchId = interaction.options.getString("watch_id") ?? undefined;
      const orders = await prisma.snipeOrder.findMany({
        where: watchId ? { narrativeWatchId: watchId } : {},
        orderBy: { triggeredAt: "desc" },
        take: 10,
        include: { narrativeWatch: { select: { title: true } } }
      });

      if (!orders.length) {
        await interaction.editReply("No snipe orders found.");
        return;
      }

      const lines = orders.map((o: (typeof orders)[number]) => {
        const icon = o.status === "CONFIRMED" || o.status === "SUBMITTED" ? "✅" : o.status === "FAILED" ? "❌" : "⏳";
        const sig = o.txSignature ? ` [tx](https://solscan.io/tx/${o.txSignature})` : "";
        return `${icon} \`${o.mintAddress.slice(0, 8)}…\` **${o.amountSol} SOL** — ${o.narrativeWatch.title} — score ${Math.round(o.finalScore)}${sig}`;
      });

      await interaction.editReply(`**Recent Snipe Orders**\n${lines.join("\n")}`);
      return;
    }

    if (group === "config" && sub === "show") {
      await interaction.deferReply({ ephemeral: true });
      const lines = [
        `**Sniper Config**`,
        `Enabled: **${env.SNIPE_ENABLED}**`,
        `Amount per snipe: **${env.SNIPE_AMOUNT_SOL} SOL**`,
        `Min score to snipe: **${env.SNIPE_MIN_SCORE}/100**`,
        `Max snipes per watch: **${env.SNIPE_MAX_PER_WATCH}**`,
        `Slippage: **${env.SNIPE_SLIPPAGE}%**`,
        `Priority fee: **${env.SNIPE_PRIORITY_FEE} SOL**`,
        `Trade URL: \`${env.PUMPPORTAL_TRADE_URL}\``,
        `RPC: \`${env.SOLANA_RPC_URL.replace(/api-key=[^&]+/, "api-key=***")}\``
      ];
      await interaction.editReply(lines.join("\n"));
      return;
    }

    await interaction.reply({ content: "Unknown subcommand.", ephemeral: true });
  }
};
