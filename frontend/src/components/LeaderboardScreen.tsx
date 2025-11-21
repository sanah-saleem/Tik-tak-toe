import type { LeaderboardEntry } from "../helpers/fetchLeaderboard";

interface Props {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  onClose: () => void;
}

export function LeaderboardScreen({ entries, me, onClose }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-md bg-slate-900/90 rounded-2xl shadow-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ✕ Close
          </button>
        </div>

        {/* {me && (
          <div className="bg-slate-800/80 rounded-xl px-3 py-2 text-xs flex justify-between items-center">
            <div>
              <div className="text-[10px] text-slate-400">Your position</div>
              <div className="text-sm font-semibold">
                #{me.rank} • {me.displayName}
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-300">
              <div>W {me.wins}</div>
              <div>L {me.losses}</div>
              <div>D {me.draws}</div>
            </div>
          </div>
        )} */}

        <div className="text-[10px] text-slate-500 uppercase tracking-wide">
          Top players
        </div>
        <div className="bg-slate-900 rounded-xl border border-slate-800">
          <div className="grid grid-cols-4 text-[10px] text-slate-400 px-3 py-1 border-b border-slate-800">
            <div>#</div>
            <div>Player</div>
            <div className="text-center">W</div>
            <div className="text-center">L/D</div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {entries.length === 0 && (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                No games played yet.
              </div>
            )}
            {Array.isArray(entries) ? (
              entries.map((e) => {
              const isMe = me && e.userId === me.userId;
              return (
                <div
                  key={e.userId}
                  className={`grid grid-cols-4 px-3 py-1 text-xs items-center ${
                    isMe
                      ? "bg-slate-800/80 text-teal-200"
                      : "text-slate-200"
                  }`}
                >
                  <div>#{e.rank}</div>
                  <div className="truncate">{e.displayName}</div>
                  <div className="text-center">{e.wins}</div>
                  <div className="text-center">
                    {e.losses}/{e.draws}
                  </div>
                </div>
              );
            })
            ) : (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                No leaderboard data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
