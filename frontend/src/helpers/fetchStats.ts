import type { Session } from "@heroiclabs/nakama-js";
import { nakamaClient } from "../api/nakamaClient";

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
}

export async function fetchPlayerStats(session: Session): Promise<PlayerStats> {
  const res = await nakamaClient.rpc(session, "get_tiktaktoe_stats", {});
  const payload =
    typeof res.payload === "string" ? JSON.parse(res.payload) : res.payload;

  return {
    wins: payload?.wins ?? 0,
    losses: payload?.losses ?? 0,
    draws: payload?.draws ?? 0,
  };
}