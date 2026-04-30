import { CandidateState, NarrativeStatus } from "@prisma/client";
import { ButtonInteraction, ChatInputCommandInteraction, GuildMember, InteractionReplyOptions } from "discord.js";
import { prisma } from "../../db/prisma.js";
import { candidateEmbed } from "../../discord/embeds/candidateEmbed.js";
import { finalSummaryEmbed } from "../../discord/embeds/finalSummaryEmbed.js";
import { env } from "../../utils/env.js";

export async function pinCandidate(watchId: string, mint: string): Promise<InteractionReplyOptions> {
  const candidate = await prisma.coinCandidate.update({
    where: { narrativeWatchId_mintAddress: { narrativeWatchId: watchId, mintAddress: mint } },
    data: { isPinned: true, isIgnored: false, state: CandidateState.PINNED },
    include: { narrativeWatch: true }
  });
  return { embeds: [candidateEmbed(candidate, candidate.narrativeWatch)] };
}

export async function ignoreCandidate(watchId: string, mint: string): Promise<InteractionReplyOptions> {
  const candidate = await prisma.coinCandidate.update({
    where: { narrativeWatchId_mintAddress: { narrativeWatchId: watchId, mintAddress: mint } },
    data: { isIgnored: true, isPinned: false, state: CandidateState.IGNORED },
    include: { narrativeWatch: true }
  });
  return { content: `Ignored ${candidate.symbol} for ${candidate.narrativeWatch.title}.`, ephemeral: true };
}

export async function explainCandidate(watchId: string, mint: string): Promise<InteractionReplyOptions> {
  const candidate = await prisma.coinCandidate.findUnique({
    where: { narrativeWatchId_mintAddress: { narrativeWatchId: watchId, mintAddress: mint } },
    include: { narrativeWatch: true }
  });
  if (!candidate) {
    return { content: "Candidate not found.", ephemeral: true };
  }
  return { embeds: [candidateEmbed(candidate, candidate.narrativeWatch)] };
}

export async function concludeCandidate(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  watchId: string,
  mint: string
): Promise<InteractionReplyOptions> {
  if (env.ADMIN_ONLY_CONCLUDE_ARCHIVE && !hasManageGuild(interaction)) {
    return { content: "Only server managers can conclude this watch.", ephemeral: true };
  }

  const candidate = await prisma.coinCandidate.update({
    where: { narrativeWatchId_mintAddress: { narrativeWatchId: watchId, mintAddress: mint } },
    data: { state: CandidateState.FINAL_SELECTED, isPinned: true, isIgnored: false },
    include: { narrativeWatch: true }
  });

  const watch = await prisma.narrativeWatch.update({
    where: { id: watchId },
    data: {
      status: NarrativeStatus.CONCLUDED,
      concludedAt: new Date(),
      finalMintAddress: mint
    }
  });

  return {
    content: `Search concluded. Final selected candidate: ${candidate.symbol}.`,
    embeds: [finalSummaryEmbed(watch, candidate)]
  };
}

export async function archiveWatch(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  watchId: string
): Promise<InteractionReplyOptions> {
  if (env.ADMIN_ONLY_CONCLUDE_ARCHIVE && !hasManageGuild(interaction)) {
    return { content: "Only server managers can archive this watch.", ephemeral: true };
  }

  const watch = await prisma.narrativeWatch.update({
    where: { id: watchId },
    data: { status: NarrativeStatus.ARCHIVED }
  });

  return { content: `Archived narrative watch ${watch.title} (${watch.id}).` };
}

function hasManageGuild(interaction: ChatInputCommandInteraction | ButtonInteraction): boolean {
  const member = interaction.member;
  return Boolean(member instanceof GuildMember && member.permissions.has("ManageGuild"));
}
