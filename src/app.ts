import express from "express";
import type { Server } from "socket.io";
import { authRouter } from "./modules/auth/auth.routes.ts";
import { createChatRouter } from "./modules/chat/chat.routes.ts";
import { gamesRouter } from "./modules/games/games.routes.ts";
import { uploadsRouter } from "./modules/uploads/uploads.routes.ts";
import { usersRouter } from "./modules/users/users.routes.ts";

export function createApp(io: Server) {
  const app = express();

  app.use(uploadsRouter);
  app.use(authRouter);
  app.use(usersRouter);
  app.use(gamesRouter);
  app.use(createChatRouter(io));

  return app;
}
