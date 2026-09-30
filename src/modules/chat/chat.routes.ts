import { Router } from "express";
import type { Server } from "socket.io";
import { jsonParser } from "../../middleware/parsers.ts";
import {
  addChat,
  addChatRoom,
  getChatRooms,
  getChats,
  joinChatRoom,
} from "./chat.controller.ts";

export function createChatRouter(io: Server) {
  const chatRouter = Router();

  chatRouter.post("/addChatRoom", jsonParser, addChatRoom);
  chatRouter.get("/getChatRooms", getChatRooms);
  chatRouter.post("/joinChatRoom", jsonParser, joinChatRoom);
  chatRouter.post("/addChat", jsonParser, (req, res) => addChat(req, res, io));
  chatRouter.get("/getChats", getChats);

  return chatRouter;
}
