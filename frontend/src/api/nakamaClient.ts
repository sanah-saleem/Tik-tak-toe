import { Client } from "@heroiclabs/nakama-js";

const useSSL = false; // true when we deploy with HTTPS
const host = "127.0.0.1"; // or "localhost"
const port = "7350";
const serverKey = "tictactoe-server-key"; // from backend/local.yml

export const nakamaClient = new Client(serverKey, host, port, useSSL);
