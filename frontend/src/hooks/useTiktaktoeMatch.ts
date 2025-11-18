import { useEffect, useState } from "react";
import type { Session, Socket } from "@heroiclabs/nakama-js";
import {
  type GameState,
  OPCODE_MOVE,
  OPCODE_STATE,
  OPCODE_ERROR,
} from "../types/game";
import { nakamaClient } from "../api/nakamaClient";

interface UseTictactoeMatchOptions {
  socket: Socket | null;
  userId: string | null;
  session: Session | null;
}

interface UseTictactoeMatchResult {
  gameState: GameState | null;
  matchId: string | null;
  isInMatch: boolean;
  isLoading: boolean;
  error: string | null;
  createMatch: () => Promise<void>;
  joinMatchById: (id: string) => Promise<void>;
  sendMove: (index: number) => void;
  resetError: () => void;
}

const initialGameState: GameState = {
  board: ["", "", "", "", "", "", "", "", ""],
  players: [],
  nextTurnUserId: null,
  winnerUserId: null,
  isDraw: false,
  isFinished: false,
};

type CreateMatchResponse = {
  matchId: string;
};

export function isGameState(value: any): value is GameState {
    return (
        value &&
        Array.isArray(value.board) &&
        value.board.length === 9 &&
        value.board.every((c: any) => c === "" || c === "X" || c === "O") &&
        Array.isArray(value.players) &&
        typeof value.isDraw === "boolean" &&
        typeof value.isFinished === "boolean"
    );
}

export function useTictactoeMatch(
  options: UseTictactoeMatchOptions
): UseTictactoeMatchResult {
  const { socket, userId } = options;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInMatch = !!matchId;

  useEffect(() => {

    console.log("checking socket connection");

    if (!socket) return;

    console.log("[useTictactoeMatch] attaching onmatchdata to", socket);

    const handler = (ev: any) => {
      const { match_id, op_code, data, presence } = ev;

      const decodeDataToJson = (): string => {
        if (!data) return "";
        if (data instanceof Uint8Array || ArrayBuffer.isView(data)) {
          return new TextDecoder().decode(data as Uint8Array);
        }
        if (typeof data === "string") {
          return data;
        }
        return String(data);
      };

      if (op_code === OPCODE_STATE) {
        try {
            const json = decodeDataToJson();
            console.log("[STATE raw json]", json);
            const decoded: GameState = JSON.parse(json);
            if (!isGameState(decoded)) {
                console.error("Received invalid game state:", decoded);
                return;
            }
            setGameState(decoded);
            if (!matchId) {
                setMatchId(match_id);
            }
        } catch (e) {
            console.error("Failed to parse game state:", e);
        }
      }

      if (op_code === OPCODE_ERROR) {
        try {
            const json = decodeDataToJson();
            console.log("[ERROR raw json]", json);
            const decoded = JSON.parse(json);
            setError(decoded.message || "Server error.");
        } catch {
            setError("Server error.");
        }
      }
    };

    socket.onmatchdata = handler;

    return () => {
      if (socket.onmatchdata === handler) {
        socket.onmatchdata = () => {};
      }
    };
  }, [socket, matchId]);

  const createMatch = async () => {
    if (!socket) {
      setError("Socket not connected.");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      setGameState(initialGameState);
      setMatchId(null);

      // call the Lua rpc to create an authoritative match
      const rpcId = "create_tiktaktoe_match";
      const rpcRes = await nakamaClient.rpc(options.session!, rpcId, {});
      const payload = rpcRes.payload as CreateMatchResponse;
      if (!payload || !payload.matchId) {
        throw new Error("RPC did not return a matchId")
      }
      const matchId = payload.matchId;

      //join the match over the socket
      const match = await socket.joinMatch(matchId);
      setMatchId(match.match_id);
      // Lua match_join will run and broadcast OPCODE_STATE
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to create match.");
    } finally {
      setIsLoading(false);
    }
  };

  const joinMatchById = async (id: string) => {
    if (!socket) {
      setError("Socket not connected.");
      return;
    }
    if (!id.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      setGameState(initialGameState);
      setMatchId(null);

      const match = await socket.joinMatch(id.trim());
      setMatchId(match.match_id);
      // Server will send STATE.
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to join match.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendMove = (index: number) => {
    if (!socket || !matchId || !userId) return;
    if (!gameState || gameState.isFinished) return;

    // Optional client-side checks (server is still authoritative)
    if (gameState.nextTurnUserId && gameState.nextTurnUserId !== userId) {
      setError("It's not your turn.");
      return;
    }
    if (gameState.board[index] !== "") {
      setError("That cell is already taken.");
      return;
    }

    const payload = JSON.stringify({ index });
    socket.sendMatchState(matchId, OPCODE_MOVE, payload);
  };

  const resetError = () => setError(null);

  return {
    gameState,
    matchId,
    isInMatch,
    isLoading,
    error,
    createMatch,
    joinMatchById,
    sendMove,
    resetError,
  };
}
