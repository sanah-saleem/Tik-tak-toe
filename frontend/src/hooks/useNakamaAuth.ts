import { useEffect, useState } from "react";
import { nakamaClient } from "../api/nakamaClient";
import type { Session, Socket } from "@heroiclabs/nakama-js";

export interface UseNakamaAuthResult {
  session: Session | null;
  socket: Socket | null;
  isConnecting: boolean;
  error: string | null;
  connect: (nickname: string) => Promise<void>;
  autoConnecting: boolean;
  logout: () => void;
}

function getOrCreateDeviceId(): string {
  const key = "ttt_device_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const newId = crypto.randomUUID();
  localStorage.setItem(key, newId);
  return newId;
}

export function useNakamaAuth(): UseNakamaAuthResult {
  const [session, setSession] = useState<Session | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(false);

  const connect = async (nickname: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      const deviceId = getOrCreateDeviceId();

      // login or create account
      const session = await nakamaClient.authenticateDevice(
        deviceId,
        true,
      );

      //update nickname on this account everytime
      await nakamaClient.updateAccount(session, {
        display_name: nickname,
      });

      const refreshed = await nakamaClient.sessionRefresh(session);

      localStorage.setItem("ttt_nickname", nickname);

      setSession(refreshed);

      const s = nakamaClient.createSocket(false, false);
      await s.connect(refreshed, true);
      setSocket(s);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to connect to server.");
      setSession(null);
      setSocket(null);
    } finally {
      setIsConnecting(false);
    }
  };


  const logout = () => {
    if (socket) {
      try {
        socket.disconnect(true);
      } catch (e) {
        console.error(e);
      }
    }
    setSession(null);
    setSocket(null);
    setError(null);
  };

  // auto connect on mount if we have a saved nickname
  useEffect(() => {
    const savedNickname = localStorage.getItem("ttt_nickname");
    if ( !savedNickname || session || socket ) return;
    setAutoConnecting(true)
    connect(savedNickname).finally(() => setAutoConnecting(false));
  }, [session, socket]);

  return { session, socket, isConnecting, error, connect, autoConnecting, logout };
}
