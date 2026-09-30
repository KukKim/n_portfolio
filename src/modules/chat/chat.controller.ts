import type { Request, Response } from "express";
import type { Server } from "socket.io";
import {
  findChatMessages,
  findChatRoomById,
  findChatRoomMember,
  findChatRooms,
  findUserById,
  insertChatRoomMember,
} from "./chat.repository.ts";
import { createChatMessage, createChatRoom } from "./chat.service.ts";

export async function addChatRoom(req: Request, res: Response) {
  const { title, userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "userId is required",
    });
  }
  try {
    const roomId = await createChatRoom(title, userId);

    return res.status(200).json({
      success: true,
      message: "Chat room created successfully",
      data: {
        roomId,
        title: title ?? null,
        memberId: userId,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
}

export async function getChatRooms(req: Request, res: Response) {
  try {
    const chatRooms = await findChatRooms();

    return res.status(200).json({
      success: true,
      data: chatRooms,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "SERVER_ERROR",
    });
  }
}

export async function joinChatRoom(req: Request, res: Response) {
  const { roomId, userId } = req.body;

  if (!roomId || !userId) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "roomId and userId are required",
    });
  }

  try {
    // 이코드가 필요한가?
    const roomRows = await findChatRoomById(roomId);

    if (roomRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "CHAT_ROOM_NOT_FOUND",
        message: "Chat room not found",
      });
    }

    const userRows = await findUserById(userId);

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const memberRows = await findChatRoomMember(roomId, userId);

    if (memberRows.length > 0) {
      return res.status(409).json({
        success: false,
        code: "ALREADY_JOINED",
        message: "User has already joined this chat room",
      });
    }
    //////

    await insertChatRoomMember(roomId, userId);

    return res.status(201).json({
      success: true,
      message: "Joined chat room successfully",
      data: {
        roomId,
        userId,
        joinedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
}

export async function addChat(req: Request, res: Response, io: Server) {
  const { roomId, senderId, message, messageType = "text" } = req.body;

  if (!roomId || !senderId || typeof message !== "string") {
    return res.status(400).json({
      success: false,
      message: "roomId, senderId, message는 필수입니다.",
    });
  }

  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return res.status(400).json({
      success: false,
      message: "메시지는 공백일 수 없습니다.",
    });
  }

  const allowedMessageTypes = ["text", "image", "video", "file", "system"];

  if (!allowedMessageTypes.includes(messageType)) {
    return res.status(400).json({
      success: false,
      message: "지원하지 않는 메시지 타입입니다.",
    });
  }

  try {
    const memberRows = await findChatRoomMember(roomId, senderId);

    if (memberRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "해당 채팅방에 참여한 사용자만 메시지를 보낼 수 있습니다.",
      });
    }

    const createdMessage = await createChatMessage(
      io,
      roomId,
      senderId,
      trimmedMessage,
    );

    return res.status(201).json({
      success: true,
      message: "메시지가 생성되었습니다.",
      data: createdMessage,
    });
  } catch (error) {
    console.error("addChat error:", error);

    return res.status(500).json({
      success: false,
      message: "메시지 생성 중 오류가 발생했습니다.",
    });
  }
}

export async function getChats(req: Request, res: Response) {
  try {
    const { roomId, cursor, limit = 30 } = req.query;

    const rows = await findChatMessages(roomId, cursor, limit);

    const hasNextPage = rows.length > Number(limit);

    const messages = hasNextPage ? rows.slice(0, Number(limit)) : rows;

    const nextCursor =
      hasNextPage && messages.length > 0
        ? String(messages[messages.length - 1].id)
        : null;

    return res.status(200).json({
      success: true,
      data: { messages, nextCursor },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "SERVER_ERROR",
    });
  }
}
