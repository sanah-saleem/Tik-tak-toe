import { useEffect, useState } from "react";
import { useNakamaAuth } from "./hooks/useNakamaAuth";
import { NicknameScreen } from "./components/NicknameScreen";
import { MainMenu } from "./components/MainMenu";
import { GameScreen } from "./components/GameScreen";
import { useTictactoeMatch } from "./hooks/useTikTakToeMatch";

type Screen = "nickname" | "menu" | "game";

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
    createMatch,
    joinMatchById,
    sendMove,
    resetError,
  } = useTictactoeMatch({
    socket,
    userId: session?.user_id ?? null,
    session,
  });

  useEffect(() => {
    if (session && socket) {
      setScreen("menu");
      setNickname(session.username ?? "Player");
    }
  }, [session, socket]);

  // Simple combined error handling
  const combinedError = error || matchError;

  const handleBackToMenu = () => {
    setScreen("menu");
  };

  if (!session || !session.user_id || screen === "nickname") {
    return (
      <NicknameScreen
        onSubmit={connect}
        isConnecting={isConnecting}
        error={error}
      />
    );
  }

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
          userId={session.user_id}
          nickname={nickname}
          matchId={matchId}
          gameState={gameState}
          onCellClick={sendMove}
          onBackToMenu={handleBackToMenu}
        />
      </>
    );
  }

  // Default: main menu
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
        userId={session.user_id}
        onCreateMatch={async () => {
          await createMatch();
          setScreen("game");
        }}
        onJoinMatch={async (id) => {
          await joinMatchById(id);
          setScreen("game");
        }}
        isLoading={isMatchLoading}
      />
    </>
  );
}

export default App;
