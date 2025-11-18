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






// import { type FormEvent, useState } from "react";

// interface Props {
//   nickname: string;
//   userId: string;
//   onCreateMatch: () => void;
//   onJoinMatch: (id: string) => void;
//   isLoading: boolean;
// }

// export function MainMenu({
//   nickname,
//   userId,
//   onCreateMatch,
//   onJoinMatch,
//   isLoading,
// }: Props) {
//   const [matchIdInput, setMatchIdInput] = useState("");

//   const handleJoin = (e: FormEvent) => {
//     e.preventDefault();
//     if (!matchIdInput.trim() || isLoading) return;
//     onJoinMatch(matchIdInput.trim());
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
//       <div className="w-full max-w-sm bg-slate-900/70 rounded-2xl shadow-lg p-6 space-y-5">
//         <div className="text-center space-y-1">
//           <p className="text-sm text-slate-400">Connected as</p>
//           <p className="text-lg font-semibold">{nickname}</p>
//           <p className="text-[10px] text-slate-500 break-all">
//             ID: {userId}
//           </p>
//         </div>

//         <button
//           onClick={onCreateMatch}
//           disabled={isLoading}
//           className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-60 py-2 font-medium transition"
//         >
//           {isLoading ? "Creating match..." : "Create New Match"}
//         </button>

//         <div className="border-t border-slate-800 pt-4">
//           <p className="text-xs text-slate-400 mb-2 text-center">
//             Or join an existing match
//           </p>
//           <form onSubmit={handleJoin} className="space-y-2">
//             <input
//               type="text"
//               value={matchIdInput}
//               onChange={(e) => setMatchIdInput(e.target.value)}
//               placeholder="Paste Match ID"
//               className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-400"
//             />
//             <button
//               type="submit"
//               disabled={isLoading || !matchIdInput.trim()}
//               className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-60 py-2 text-sm transition"
//             >
//               {isLoading ? "Joining..." : "Join Match"}
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }
