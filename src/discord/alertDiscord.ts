import { Client, TextBasedChannel } from "discord.js";
import { prisma } from "../db/prisma.js";
import { candidateEmbed } from "./embeds/candidateEmbed.js";

export class DiscordAlertService {
  constructor(private readonly client: Client) {}

  async sendCandidateAlert(params: {
    channelId: string;
    narrativeWatchId: string;
    candidateId: string;
    type: string;
    message: string;
  }): Promise<void> {
    const duplicate = await prisma.alertLog.findFirst({
      where: {
        narrativeWatchId: params.narrativeWatchId,
        candidateId: params.candidateId,
        type: params.type,
        sentAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    });

    if (duplicate) {
      return;
    }

    const channel = await this.client.channels.fetch(params.channelId);
    if (!channel?.isTextBased() || !("send" in channel)) {
      return;
    }

    const candidate = await prisma.coinCandidate.findUnique({
      where: { id: params.candidateId },
      include: { narrativeWatch: true }
    });

    if (!candidate) {
      return;
    }

    await channel.send({
      content: params.message,
      embeds: [candidateEmbed(candidate, candidate.narrativeWatch)]
    });

    await prisma.alertLog.create({
      data: {
        narrativeWatchId: params.narrativeWatchId,
        candidateId: params.candidateId,
        type: params.type,
        message: params.message
      }
    });
  }

  async sendWatchAlert(params: {
    channelId: string;
    narrativeWatchId: string;
    type: string;
    message: string;
  }): Promise<void> {
    const duplicate = await prisma.alertLog.findFirst({
      where: {
        narrativeWatchId: params.narrativeWatchId,
        type: params.type,
        sentAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    });

    if (duplicate) {
      return;
    }

    const channel = await this.client.channels.fetch(params.channelId);
    if (channel?.isTextBased() && "send" in channel) {
      await channel.send(params.message);
    }

    await prisma.alertLog.create({
      data: {
        narrativeWatchId: params.narrativeWatchId,
        type: params.type,
        message: params.message
      }
    });
  }
}
