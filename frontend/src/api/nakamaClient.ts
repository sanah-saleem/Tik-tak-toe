import { Client } from "@heroiclabs/nakama-js";

const useSSL = import.meta.env.VITE_NAKAMA_USE_SSL === "true"
const host = import.meta.env.VITE_NAKAMA_HOST! //"127.0.0.1";
const port = import.meta.env.VITE_NAKAMA_PORT || "7350";
const serverKey = import.meta.env.VITE_NAKAMA_SERVER_KEY || "tictactoe-server-key";

export const nakamaClient = new Client(serverKey, host, port, useSSL);
