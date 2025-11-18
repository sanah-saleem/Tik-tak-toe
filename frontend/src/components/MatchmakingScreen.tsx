interface Props {
  onCancel: () => void;
}

export function MatchmakingScreen({ onCancel }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-sm bg-slate-900/80 rounded-2xl shadow-lg p-6 space-y-5 text-center">
        <h1 className="text-lg font-semibold">Finding a random player…</h1>
        <p className="text-xs text-slate-400">
          It usually takes around 20 seconds.
        </p>

        <div className="mt-4 flex justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
        </div>

        <button
          onClick={onCancel}
          className="mt-6 w-full rounded-lg bg-slate-700 hover:bg-slate-600 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
