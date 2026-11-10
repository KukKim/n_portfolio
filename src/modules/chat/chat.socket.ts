import type { Server } from "socket.io";
import {
  findChatRoomMember,
  findLastMessageId,
  updateLastReadMessageId,
} from "./chat.repository.ts";

export function registerChatSocket(io: Server) {
  io.on("connection", (socket) => {
    socket.on("chat:room:create", async ({ title, userId }, callback) => {
      console.log("chat:room:create - ", title, userId);
    });
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
        await socket.join(roomName);
        const messageRows = await findLastMessageId(roomId);
        const lastMessageId = messageRows[0]?.lastMessageId ?? null;

        if (lastMessageId !== null) {
          await updateLastReadMessageId(lastMessageId, roomId, userId);

          io.to(roomName).emit("chat:read", {
            roomId: String(roomId),
            userId: String(userId),
            lastReadMessageId: String(lastMessageId),
          });
        }

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

    socket.on("chat:read", async ({ roomId, userId, lastReadMessageId }) => {
      console.log("chat:read - ", roomId, userId, lastReadMessageId);
      if (!roomId || !userId || !lastReadMessageId) return;

      try {
        const memberRows = await findChatRoomMember(roomId, userId);
        if (memberRows.length === 0) return;

        await updateLastReadMessageId(lastReadMessageId, roomId, userId);

        // 해당 방에 참여 중인 요청자 자신도 수신합니다.
        io.to(`chat-room:${roomId}`).emit("chat:read", {
          roomId,
          userId,
          lastReadMessageId,
        });
      } catch (error) {
        console.error("chat:read error:", error);
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
