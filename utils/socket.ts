import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_BASE_URL as string;

export const socket = io(SOCKET_URL, {
  autoConnect: false,
});
