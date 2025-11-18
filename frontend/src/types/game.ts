// src/types/game.ts
export const OPCODE_MOVE = 1;
export const OPCODE_STATE = 2;
export const OPCODE_ERROR = 3;

export interface PlayerInfo {
  userId: string;
  username: string;
  mark: "X" | "O";
}

export type CellValue = "" | "X" | "O";

export interface GameState {
  board: CellValue[];
  players: PlayerInfo[];
  nextTurnUserId: string | null;
  winnerUserId: string | null;
  isDraw: boolean;
  isFinished: boolean;
  endReason?: string; 
}
