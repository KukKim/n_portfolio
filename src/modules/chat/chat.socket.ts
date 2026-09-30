import type { Server } from "socket.io";
import {
  findChatRoomMember,
  findLastMessageId,
  updateLastReadMessageId,
} from "./chat.repository.ts";

export function registerChatSocket(io: Server) {
  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    socket.on("chat:join", async ({ roomId, userId }, callback) => {
      console.log("chat:join - ", roomId, userId);
      if (!roomId || !userId) {
        callback?.({
          success: false,
          message: "roomId와 userId는 필수입니다.",
        });
        return;
      }

      try {
        const roomName = `chat-room:${roomId}`;
        const memberRows = await findChatRoomMember(roomId, userId);
        if (memberRows.length === 0) {
          callback?.({
            success: false,
            message: "해당 채팅방에 참여하지 않은 사용자입니다.",
          });
          return;
        }
        const messageRows = await findLastMessageId(roomId);
        const lastMessageId = messageRows[0]?.lastMessageId ?? null;
        await updateLastReadMessageId(lastMessageId, roomId, userId);

        await socket.join(roomName);
        callback?.({
          success: true,
          roomId,
          lastReadMessageId: lastMessageId,
        });
        console.log(`${socket.id} joined ${roomName}`);
      } catch (error) {
        console.error("chat:join error:", error);

        callback?.({
          success: false,

          message: "채팅방 입장 처리 중 오류가 발생했습니다.",
        });
      }
    });

    socket.on("chat:leave", ({ roomId }) => {
      const roomName = `chat-room:${roomId}`;

      socket.leave(roomName);

      console.log(`${socket.id} left ${roomName}`);
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  });
}
