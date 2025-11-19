import { useEffect, useState } from "react";
import { useNakamaAuth } from "./hooks/useNakamaAuth";
import { NicknameScreen } from "./components/NicknameScreen";
import { MainMenu } from "./components/MainMenu";
import { GameScreen } from "./components/GameScreen";
import { useTictactoeMatch } from "./hooks/useTikTakToeMatch";
import { useMatchmaking } from "./hooks/useMatchmaking";
import { MatchmakingScreen } from "./components/MatchmakingScreen";

type Screen = "nickname" | "menu" | "searching" | "game";

function App() {
  const { session, socket, isConnecting, error, connect } = useNakamaAuth();
  const [screen, setScreen] = useState<Screen>("nickname");
  const [nickname, setNickname] = useState<string>("");

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

  useEffect(() => {
    if (session && socket) {
      setScreen("menu");
      setNickname(session.username ?? "Player");
    }
  }, [session, socket]);

  const combinedError = error || matchError || matchmakingError || null;

  const handleBackToMenu = () => {
    setScreen("menu");
  };

  // Nickname / login
  if (!session || screen === "nickname") {
    return (
      <NicknameScreen
        onSubmit={connect}
        isConnecting={isConnecting}
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
          onCellClick={sendMove}
          onBackToMenu={ async () => {
            await leaveMatch();
            handleBackToMenu();
          }}
        />
      </>
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
      />
    </>
  );
}

export default App;
