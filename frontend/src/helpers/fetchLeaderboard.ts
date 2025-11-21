import type { Session } from "@heroiclabs/nakama-js";
import { nakamaClient } from "../api/nakamaClient";

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
}

export async function fetchLeaderboard(
  session: Session,
  limit = 10
): Promise<LeaderboardResult> {
  const res = await nakamaClient.rpc(session, "get_tiktaktoe_leaderboard", {
    limit });

  const payload =
    typeof res.payload === "string" ? JSON.parse(res.payload) : res.payload;

  return {
    entries: payload?.entries ?? [],
    me: payload?.me ?? null,
  };
}
