import { useEffect, useState } from "react";
import { useNakamaAuth } from "./hooks/useNakamaAuth";
import { NicknameScreen } from "./components/NicknameScreen";
import { MainMenu } from "./components/MainMenu";

type Screen = "nickname" | "menu";

function App() {
  const { session, socket, isConnecting, error, connect } = useNakamaAuth();
  const [screen, setScreen] = useState<Screen>("nickname");
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    if (session && socket) {
      // After successful connect, go to menu
      setScreen("menu");
      setNickname(session.username ?? "Player");
    }
  }, [session, socket]);

  if (screen === "nickname" || !session) {
    return (
      <NicknameScreen
        onSubmit={connect}
        isConnecting={isConnecting}
        error={error}
      />
    );
  }

  return (
    <MainMenu nickname={nickname} userId={session.user_id!} />
  );
}

export default App;
