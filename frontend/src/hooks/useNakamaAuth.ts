import { useState } from "react";
import { nakamaClient } from "../api/nakamaClient";
import type { Session, Socket } from "@heroiclabs/nakama-js";

export interface UseNakamaAuthResult {
  session: Session | null;
  socket: Socket | null;
  isConnecting: boolean;
  error: string | null;
  connect: (nickname: string) => Promise<void>;
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

  const connect = async (nickname: string) => {
    try {
      setIsConnecting(true);
      setError(null);

      const deviceId = getOrCreateDeviceId();

      // Create or restore a device-based user and attach nickname
      const session = await nakamaClient.authenticateDevice(
        deviceId,
        true,
        nickname || undefined
      );

      setSession(session);

      const s = nakamaClient.createSocket(false, false);
      await s.connect(session, true);
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

  return { session, socket, isConnecting, error, connect };
}
