import type { PlayerStats } from "../helpers/fetchStats";

interface Props {
  nickname: string;
  userId: string;
  onPlayClassic: () => void;
  onPlayTimed: () => void;
  isSearching: boolean;
  onChangeUser: () => void;
  stats: PlayerStats;
}

export function MainMenu({
  nickname,
  userId,
  onPlayClassic,
  onPlayTimed,
  isSearching,
  onChangeUser,
  stats,
}: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-sm bg-slate-900/70 rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-sm text-slate-400">Connected as</p>
          <p className="text-lg font-semibold">{nickname}</p>
          <p className="text-[10px] text-slate-500 break-all">ID: {userId}</p>
        </div>

        <div className="bg-slate-800/70 rounded-xl px-3 py-2 text-xs text-slate-300 flex justify-between">
          <div className="text-center flex-1">
            <div className="text-[10px] text-slate-400">WINS</div>
            <div className="font-semibold text-teal-400">{stats.wins}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-[10px] text-slate-400">LOSSES</div>
            <div className="font-semibold text-rose-400">{stats.losses}</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-[10px] text-slate-400">DRAWS</div>
            <div className="font-semibold text-sky-400">{stats.draws}</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onPlayClassic}
            disabled={isSearching}
            className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-60 py-2 font-medium transition"
          >
            Play Classic
            <span className="block text-xs text-slate-400">No time limit</span>
          </button>

          <button
            onClick={onPlayTimed}
            disabled={isSearching}
            className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 py-2 font-medium transition"
          >
            Play Timed
            <span className="block text-xs text-teal-100">
              30 seconds per move
            </span>
          </button>
        </div>
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onChangeUser}
            className="text-[11px] text-slate-400 hover:text-slate-200"
          >
            Change user / Logout
          </button>
        </div>
      </div>
    </div>
  );
}
