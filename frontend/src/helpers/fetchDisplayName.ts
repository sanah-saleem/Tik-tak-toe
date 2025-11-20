import type { Session } from "@heroiclabs/nakama-js";
import { nakamaClient } from "../api/nakamaClient";

export async function fetchDisplayName(session: Session, userId: string): Promise<string> {
  const res = await nakamaClient.getUsers(session, [userId]);
  const user = res.users?.[0];
  return user?.display_name || user?.username || "Player";
}