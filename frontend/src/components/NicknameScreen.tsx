import { type FormEvent, useState } from "react";

interface Props {
  onSubmit: (nickname: string) => void;
  isConnecting: boolean;
  error: string | null;
}

export function NicknameScreen({ onSubmit, isConnecting, error }: Props) {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || isConnecting) return;
    onSubmit(nickname.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="w-full max-w-sm bg-slate-900/70 rounded-2xl shadow-lg p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Who are you?
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-teal-400"
          />

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isConnecting || !nickname.trim()}
            className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 py-2 font-medium transition"
          >
            {isConnecting ? "Connecting..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
