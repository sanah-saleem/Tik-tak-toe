import type { GameState, PlayerInfo } from "../types/game";

interface Props {
  userId: string;
  nickname: string;
  matchId: string | null;
  gameState: GameState | null;
  onCellClick: (index: number) => void;
  onBackToMenu: () => void;
}

function getPlayerForUser(gameState: GameState | null, userId: string): PlayerInfo | undefined {
  if (!gameState) return undefined;
  return gameState.players.find((p) => p.userId === userId);
}

function getOpponent(gameState: GameState | null, userId: string): PlayerInfo | undefined {
  if (!gameState) return undefined;
  return gameState.players.find((p) => p.userId !== userId);
}

export function GameScreen({
  userId,
  nickname,
  matchId,
  gameState,
  onCellClick,
  onBackToMenu,
}: Props) {
  const me = getPlayerForUser(gameState ?? null, userId);
  const opponent = getOpponent(gameState ?? null, userId);

  const myMark = me?.mark ?? "?";
  const oppMark = opponent?.mark ?? "?";

  const isMyTurn = !!gameState?.nextTurnUserId && gameState.nextTurnUserId === userId;

  let statusText = "Waiting for opponent...";
  if (gameState) {
    if (!gameState.isFinished) {
      if (!opponent) {
        statusText = "Waiting for another player to join…";
      } else if (isMyTurn) {
        statusText = "Your turn";
      } else {
        statusText = "Opponent's turn";
      }
    } else {
      const reason = gameState.endReason || "";
      if (gameState.isDraw || reason === "DRAW") {
        statusText = "It's a draw!";
      } else if (gameState.winnerUserId === userId && reason === "OPPONENT_LEFT") {
        statusText = "Opponent left the game, You win! 🎉";
      } else if (gameState.winnerUserId === userId) {
        statusText = "You win! 🎉"
      } else if (gameState.winnerUserId && gameState.winnerUserId !== userId) {
        statusText = "You lost 😅";
      } else {
        statusText = "Game over.";
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-md bg-slate-900/80 rounded-2xl shadow-lg p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-100 text-sm">{nickname}</p>
            <p>Your mark: <span className="font-bold text-teal-400">{myMark}</span></p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-100 text-sm">
              {opponent?.username ?? "Waiting…"}
            </p>
            <p>Opponent: <span className="font-bold text-pink-400">{oppMark}</span></p>
          </div>
        </div>

        {/* Match ID */}
        {matchId && (
          <div className="bg-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-400 flex justify-between items-center">
            <span>Match ID:</span>
            <span className="font-mono text-[11px] break-all">{matchId}</span>
          </div>
        )}

        {/* Status */}
        <div className="text-center text-sm text-slate-200">
          {statusText}
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {Array.from({ length: 9 }).map((_, i) => {
            const value = gameState?.board?.[i] ?? "";
            const disabled =
              !gameState ||
              gameState.isFinished ||
              !opponent ||
              !isMyTurn ||
              value !== "";

            return (
              <button
                key={i}
                onClick={() => onCellClick(i)}
                disabled={disabled}
                className={`aspect-square rounded-xl border border-slate-700 flex items-center justify-center text-3xl font-bold
                  ${disabled ? "bg-slate-800/80" : "bg-slate-800 hover:bg-slate-700"}
                `}
              >
                {value === "X" && <span className="drop-shadow">{value}</span>}
                {value === "O" && <span className="drop-shadow">{value}</span>}
              </button>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={onBackToMenu}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ← Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
