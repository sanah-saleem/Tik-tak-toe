interface Props {
  nickname: string;
  userId: string;
  onPlayClassic: () => void;
  onPlayTimed: () => void;
  isSearching: boolean;
  onChangeUser: () => void;
}

export function MainMenu({
  nickname,
  userId,
  onPlayClassic,
  onPlayTimed,
  isSearching,
  onChangeUser,
}: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-sm bg-slate-900/70 rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-sm text-slate-400">Connected as</p>
          <p className="text-lg font-semibold">{nickname}</p>
          <p className="text-[10px] text-slate-500 break-all">ID: {userId}</p>
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
