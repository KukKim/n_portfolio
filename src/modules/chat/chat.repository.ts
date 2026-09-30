import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { connection } from "../../infra/database.ts";

export async function insertChatRoom(title: unknown) {
  const [roomResult] = await connection.query<ResultSetHeader>(
    `
    INSERT INTO chat_room
    (
      title
    )
    VALUES (?)
    `,
    [title],
  );

  return roomResult;
}

export async function insertChatRoomMember(roomId: unknown, userId: unknown) {
  const [result] = await connection.query<ResultSetHeader>(
    `
    INSERT INTO chat_room_member
    (
      room_id,
      user_id
    )
    VALUES (?, ?)
    `,
    [roomId, userId],
  );

  return result;
}

export async function findChatRooms() {
  const [chatRooms] = await connection.query<RowDataPacket[]>(`
    SELECT
        cr.id,
        cr.title,
        cr.created_at AS createdAt,
        cr.updated_at AS updatedAt,

        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'imgUri', u.image_uri,
                'accountType', u.account_type,
                'joinedAt', crm.joined_at,
                'lastReadMessageId', crm.last_read_message_id
            )
        ) AS members

    FROM chat_room cr

    LEFT JOIN chat_room_member crm
      ON cr.id = crm.room_id

    LEFT JOIN user u
      ON crm.user_id = u.id

    GROUP BY
        cr.id,
        cr.title,
        cr.created_at,
        cr.updated_at
  `);

  return chatRooms;
}

export async function findChatRoomById(roomId: unknown) {
  const [roomRows] = await connection.query<RowDataPacket[]>(
    `
    SELECT id
    FROM chat_room
    WHERE id = ?
    LIMIT 1
    `,
    [roomId],
  );

  return roomRows;
}

export async function findUserById(userId: unknown) {
  const [userRows] = await connection.query<RowDataPacket[]>(
    `
    SELECT id
    FROM user
    WHERE id = ?
    LIMIT 1
    `,
    [userId],
  );

  return userRows;
}

export async function findChatRoomMember(roomId: unknown, userId: unknown) {
  const [memberRows] = await connection.query<RowDataPacket[]>(
    `
    SELECT room_id, user_id
    FROM chat_room_member
    WHERE room_id = ?
      AND user_id = ?
    LIMIT 1
    `,
    [roomId, userId],
  );

  return memberRows;
}

export async function insertChatMessage(
  roomId: unknown,
  senderId: unknown,
  message: string,
) {
  const [insertResult] = await connection.query<ResultSetHeader>(
    `
      INSERT INTO chat_message (
        room_id,
        sender_id,
        message
      )
      VALUES (?, ?, ?)
    `,
    [roomId, senderId, message],
  );

  return insertResult;
}

export async function findChatMessageById(messageId: unknown) {
  const [messageRows] = await connection.query<RowDataPacket[]>(
    `
      SELECT
        cm.id,
        cm.room_id AS roomId,
        cm.sender_id AS senderId,
        cm.message,
        cm.message_type AS messageType,
        cm.created_at AS createdAt,
        cm.updated_at AS updatedAt,
        u.name,
        u.image_uri AS imgUri
      FROM chat_message cm

      INNER JOIN user u
        ON u.id = cm.sender_id

      WHERE cm.id = ?
      LIMIT 1
    `,
    [messageId],
  );

  return messageRows;
}

export async function findChatMessages(
  roomId: unknown,
  cursor: unknown,
  limit: unknown,
) {
  const queryParams: unknown[] = [roomId];
  let cursorCondition = "";

  if (cursor) {
    cursorCondition = "AND id < ?";
    queryParams.push(cursor);
  }

  queryParams.push(Number(limit) + 1);

  const [rows] = await connection.query<RowDataPacket[]>(
    `
    SELECT
        id,
        room_id AS roomId,
        sender_id AS senderId,
        message,
        message_type AS messageType,
        created_at AS createdAt,
        updated_at AS updatedAt
    FROM chat_message
    WHERE room_id = ?
      ${cursorCondition}
    ORDER BY id DESC
    LIMIT ?
  `,
    queryParams,
  );

  return rows;
}

export async function findLastMessageId(roomId: unknown) {
  const [messageRows] = await connection.query<RowDataPacket[]>(
    `
      SELECT MAX(id) AS lastMessageId
      FROM chat_message
      WHERE room_id = ?
    `,
    [roomId],
  );

  return messageRows;
}

export async function updateLastReadMessageId(
  lastMessageId: unknown,
  roomId: unknown,
  userId: unknown,
) {
  await connection.query(
    `
      UPDATE chat_room_member
      SET last_read_message_id = ?
      WHERE room_id = ?
        AND user_id = ?
    `,
    [lastMessageId, roomId, userId],
  );
}
