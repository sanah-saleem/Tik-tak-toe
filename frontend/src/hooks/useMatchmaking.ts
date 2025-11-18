import { useState } from "react";
import type { Socket, MatchmakerTicket } from "@heroiclabs/nakama-js";

interface UseMatchmakingResult {
  isSearching: boolean;
  error: string | null;
  startSearch: () => Promise<void>;
  cancelSearch: () => Promise<void>;
}

export function useMatchmaking(
  socket: Socket | null,
  onMatchFound: (matchId: string) => Promise<void>
): UseMatchmakingResult {
  const [ticket, setTicket] = useState<MatchmakerTicket | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSearch = async () => {
    if (!socket) {
      setError("Not connected to server.");
      return;
    }

    try {
      setError(null);
      // Simple query: match any opponent
      const t = await socket.addMatchmaker("*", 2, 2);
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
  };
}
