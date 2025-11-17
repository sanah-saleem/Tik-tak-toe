// src/components/MainMenu.tsx
interface Props {
  nickname: string;
  userId: string;
}

export function MainMenu({ nickname, userId }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-sm bg-slate-900/70 rounded-2xl shadow-lg p-6 space-y-4 text-center">
        <p className="text-sm text-slate-400">Connected as</p>
        <p className="text-lg font-semibold">{nickname}</p>
        <p className="text-xs text-slate-500 break-all">ID: {userId}</p>

        <button
          className="mt-6 w-full rounded-lg bg-teal-500 hover:bg-teal-400 py-2 font-medium transition"
        >
          Play Online (coming next)
        </button>
      </div>
    </div>
  );
}
