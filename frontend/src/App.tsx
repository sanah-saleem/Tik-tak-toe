import { useEffect, useState } from "react";
import { useNakamaAuth } from "./hooks/useNakamaAuth";
import { NicknameScreen } from "./components/NicknameScreen";
import { MainMenu } from "./components/MainMenu";
import { GameScreen } from "./components/GameScreen";
import { useTictactoeMatch } from "./hooks/useTiktaktoeMatch";
import { useMatchmaking } from "./hooks/useMatchmaking";
import { MatchmakingScreen } from "./components/MatchmakingScreen";
import { nakamaClient } from "./api/nakamaClient";
import { fetchPlayerStats, type PlayerStats } from "./helpers/fetchStats";
import { fetchLeaderboard, type LeaderboardResult } from "./helpers/fetchLeaderboard";
import { LeaderboardScreen } from "./components/LeaderboardScreen";

type Screen = "nickname" | "menu" | "searching" | "game" | "leaderboard";

function App() {
  const { session, socket, isConnecting, error, connect, autoConnecting, logout } = useNakamaAuth();
  const isBusy = isConnecting || autoConnecting;
  const [screen, setScreen] = useState<Screen>("nickname");
  const [nickname, setNickname] = useState<string>("");
  const [stats, setStats] = useState<PlayerStats>({ wins: 0, losses: 0, draws: 0, })
  const [leaderboard, setLeaderboard] = useState<LeaderboardResult | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const {
    gameState,
    matchId,
    isInMatch,
    isLoading: isMatchLoading,
    error: matchError,
    createMatch,        // still available if you want private matches later
    joinMatchById,
    sendMove,
    resetError,
    leaveMatch,
    requestRematch,
  } = useTictactoeMatch({
    socket,
    userId: session?.user_id ?? null,
    session
  });

  const {
    isSearching,
    error: matchmakingError,
    startSearch,
    cancelSearch,
    currentMode,
  } = useMatchmaking(socket, async (foundMatchId: string) => {
    // Called when Nakama's matchmaker finds a match
    await joinMatchById(foundMatchId);
    setScreen("game");
  });

  const openLeaderboard = async () => {
    if (!session) return;
    try {
      setIsLoadingLeaderboard(true);
      const lb = await fetchLeaderboard(session, 10);
      setLeaderboard(lb);
      setScreen("leaderboard");
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (session && socket) {
      setScreen("menu");
      (async () => {
        try {
          const account = await nakamaClient.getAccount(session);
          console.log(account)
          setNickname(account.user?.display_name || account.user?.username || "Player");
        } catch (err) {
          console.error("Failed to fetch account:", err)
          setNickname(session.username || "Player");
        }

        try {
          const s = await fetchPlayerStats(session);
          setStats(s);
        } catch (err) {
          console.error("Failed to fetch stats:", err);
        }
      })();
    }
  }, [session, socket]);

  useEffect(() => {
    if (!session) return;
    if (!gameState) return;
    if (!gameState.isFinished) return;

    (async () => {
      try {
        const s = await fetchPlayerStats(session);
        setStats(s);
      } catch (err) {
        console.error("Failed to refresh stats:", err);
      }
    })();
  }, [session, gameState?.isFinished]);

  const combinedError = error || matchError || matchmakingError || null;

  const handleBackToMenu = () => {
    setScreen("menu");
  };


  if (!session && autoConnecting) {
    return <div>Connecting ..... </div>
  }

  // Nickname / login
  if (!session) {
    return (
      <NicknameScreen
        onSubmit={connect}
        isConnecting={isBusy}
        error={error}
      />
    );
  }

  // Searching screen
  if (screen === "searching") {
    return (
      <>
        {combinedError && (
          <div
            className="fixed top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow z-50 cursor-pointer"
            onClick={resetError}
          >
            {combinedError}
          </div>
        )}
        <MatchmakingScreen
          mode={currentMode!}
          onCancel={async () => {
            await cancelSearch();
            setScreen("menu");
          }}
        />
      </>
    );
  }

  // Game screen
  if (screen === "game" && isInMatch) {

    return (
      <>
        {combinedError && (
          <div
            className="fixed top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow z-50 cursor-pointer"
            onClick={resetError}
          >
            {combinedError}
          </div>
        )}
        <GameScreen
          userId={session.user_id!}
          nickname={nickname}
          matchId={matchId}
          gameState={gameState}
          session={session}
          onCellClick={sendMove}
          onBackToMenu={ async () => {
            await leaveMatch();
            handleBackToMenu();
          }}
          onPlayAgain={requestRematch}
        />
      </>
    );
  }
  if (screen === "leaderboard" && leaderboard) {
    return (
      <LeaderboardScreen
        entries={leaderboard.entries}
        me={leaderboard.me}
        onClose={() => setScreen("menu")}
      />
    );
  }
  // Main menu
  return (
    <>
      {combinedError && (
        <div
          className="fixed top-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-3 py-1 rounded-full shadow z-50 cursor-pointer"
          onClick={resetError}
        >
          {combinedError}
        </div>
      )}
      <MainMenu
        nickname={nickname}
        userId={session.user_id!}
        isSearching={isSearching}
        onPlayClassic={async () => {
          await startSearch("classic");
          setScreen("searching");
        }}
        onPlayTimed={async() => {
          await startSearch("timed");
          setScreen("searching");
        }}
        onChangeUser={async () => {
          // leave any ongoing match
          await leaveMatch();
          // clear local storage
          localStorage.removeItem("ttt_nickname");
          localStorage.removeItem("ttt_last_match_id");
          // reset auth state
          logout();
          // go back to nickname screen
          setScreen("nickname");
        }}
        stats={stats}
        onShowLeaderboard={openLeaderboard}
        isLoadingLeaderboard={isLoadingLeaderboard}
      />
    </>
  );
}

export default App;
