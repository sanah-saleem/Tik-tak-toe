import { useState } from "react";
import type { Socket, MatchmakerTicket } from "@heroiclabs/nakama-js";

interface UseMatchmakingResult {
  isSearching: boolean;
  error: string | null;
  startSearch: (mode: "classic" | "timed") => Promise<void>;
  cancelSearch: () => Promise<void>;
  currentMode: "classic" | "timed" | null;
}

export function useMatchmaking(
  socket: Socket | null,
  onMatchFound: (matchId: string) => Promise<void>
): UseMatchmakingResult {
  const [ticket, setTicket] = useState<MatchmakerTicket | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<"classic" | "timed" | null>(null);

  const startSearch = async (mode: "classic" | "timed") => {
    if (!socket) {
      setError("Not connected to server.");
      return;
    }

    try {
      setError(null);
      setCurrentMode(mode)
      // Filter by mode so players only match within the same mode
      const query = "+properties.mode:" + mode;
      const stringProps = { mode };
      const t = await socket.addMatchmaker(query, 2, 2, stringProps);
      setTicket(t);
      setIsSearching(true);

      const handler = async (matched: any) => {
        // Stop searching
        setIsSearching(false);
        setTicket(null);
        socket.onmatchmakermatched = () => {};

        try {
          // matched.match_id is created by our Lua matchmaker handler
          await onMatchFound(matched.match_id);
        } catch (e: any) {
          console.error(e);
          setError(e?.message ?? "Failed to join matched game.");
        }
      };

      socket.onmatchmakermatched = handler;
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to start matchmaking.");
      setIsSearching(false);
      setTicket(null);
      setCurrentMode(null);
    }
  };

  const cancelSearch = async () => {
    if (!socket) return;
    try {
      if (ticket) {
        await socket.removeMatchmaker(ticket.ticket);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
      setTicket(null);
      if (socket.onmatchmakermatched) {
        socket.onmatchmakermatched = () => {};
      }
    }
  };

  return {
    isSearching,
    error,
    startSearch,
    cancelSearch,
    currentMode,
  };
}
