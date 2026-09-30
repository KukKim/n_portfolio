import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.ts";
import { PORT } from "./config/env.ts";
import { registerChatSocket } from "./modules/chat/chat.socket.ts";

const io = new Server();
const app = createApp(io);
const server = http.createServer(app);
io.attach(server);

registerChatSocket(io);

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
