interface Props {
  nickname: string;
  userId: string;
  onPlayOnline: () => void;
  isSearching: boolean;
}

export function MainMenu({ nickname, userId, onPlayOnline, isSearching }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-sm bg-slate-900/70 rounded-2xl shadow-lg p-6 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-sm text-slate-400">Connected as</p>
          <p className="text-lg font-semibold">{nickname}</p>
          <p className="text-[10px] text-slate-500 break-all">ID: {userId}</p>
        </div>

        <button
          onClick={onPlayOnline}
          disabled={isSearching}
          className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 py-2 font-medium transition"
        >
          {isSearching ? "Searching..." : "Play Online"}
        </button>

        {/* If you want to keep manual create/join for debugging,
            you can add small secondary buttons under this later. */}
      </div>
    </div>
  );
}
