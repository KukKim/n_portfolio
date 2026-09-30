import type { Server } from "socket.io";
import {
  findChatMessageById,
  insertChatMessage,
  insertChatRoom,
  insertChatRoomMember,
} from "./chat.repository.ts";

export async function createChatRoom(title: unknown, userId: unknown) {
  const roomResult = await insertChatRoom(title);
  const roomId = roomResult?.insertId;

  await insertChatRoomMember(roomId, userId);

  return roomId;
}

// 메시지를 저장한 뒤, 같은 채팅방에 접속한 소켓들에게 바로 전달합니다.
export async function createChatMessage(
  io: Server,
  roomId: unknown,
  senderId: unknown,
  message: string,
) {
  const insertResult = await insertChatMessage(roomId, senderId, message);

  const messageRows = await findChatMessageById(insertResult.insertId);

  const createdMessage = messageRows[0];
  const roomName = `chat-room:${roomId}`;

  io.to(roomName).emit("chat:message", createdMessage);

  return createdMessage;
}
