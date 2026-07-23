// Get the client
import mysql from "mysql2/promise";
import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import dotenv from "dotenv";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getAccessToken, getGames, getGamesAgeRatings } from "./src/twitch.ts";

dotenv.config();
const accessToken = await getAccessToken();
// Create the connection to database
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

const app = express();
const port = 3000;
// create application/json parser
const jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/check", jsonParser, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "TOKEN_REQUIRED",
      message: "Token is required",
    });
  }
  try {
    const [users] = await connection.query(
      "SELECT id, name, email, imgUri, token, loginDate, expireDate FROM user WHERE token = ?",
      [token],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid token",
      });
    }

    const user = users[0];
    const now = new Date();
    const expireDate = new Date(user.expireDate);

    if (expireDate < now) {
      await connection.query(
        `
        UPDATE user
        SET token = NULL
        WHERE id = ?
        `,
        [user.id],
      );

      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Token has expired. Please sign in again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        id: user.id,
        // name: user.name,
        // email: user.email,
        // imgUri: user.imgUri,
        // token: user.token,
        // loginDate: user.loginDate,
        // expireDate: user.expireDate,
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
});

// TODO: 후에 POST 로 변경 필요. POST에서 SSL로 변경
app.get("/signin", jsonParser, async (req, res) => {
  const { email, password } = req.query;
  try {
    const [users] = await connection.query(
      "SELECT * FROM user WHERE email = '" +
        email +
        "' AND password = '" +
        password +
        "';",
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const loginDate = new Date();
    const expireDate = new Date(loginDate);
    expireDate.setDate(expireDate.getDate() + 100);

    await connection.query(
      "UPDATE user SET loginDate = ?, token = ?, expireDate = ? WHERE id = ?",
      [loginDate, token, expireDate, user.id],
    );

    return res.status(200).json({
      success: true,
      message: "Signin successful",
      data: {
        name: user.name,
        imgUri: user.imgUri,
        token,
        loginDate,
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
});

app.post("/signup", jsonParser, async (req, res) => {
  const { name, email, imgUri, password, accountType } = req.body;
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const loginDate = new Date();
    const expireDate = new Date(loginDate);
    expireDate.setDate(expireDate.getDate() + 100);
    const [result] = await connection.query(
      `
      INSERT INTO user
      (
        name,
        email,
        imgUri,
        password,
        token,
        loginDate,
        expireDate,
        accountType
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        email,
        imgUri,
        password,
        token,
        loginDate,
        expireDate,
        accountType,
      ],
    );
    return res.status(201).json({
      success: true,
      message: "Signup successful",
      data: { id: result.insertId, token, name, email, imgUri },
    });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        code: "EMAIL_DUPLICATED",
        message: "This email is already in use",
      });
    }
    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
});

app.post("/registerpushtoken", jsonParser, async (req, res) => {
  const { pushtoken, platform, id } = req.body;

  if (!pushtoken || !id || !["ios", "android"].includes(platform)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "pushtoken, platform, id are required",
    });
  }

  const column = platform === "ios" ? "pushTokenIOS" : "pushTokenAndroid";

  try {
    const [result] = await connection.query(
      `UPDATE user SET ${column} = ? WHERE id = ?`,
      [pushtoken, id],
    );

    return res.status(200).json({
      success: true,
      message: "Push token registered successfully",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
});

// TODO: AI로 만든 코드 이해 필요
app.get("/getgames", jsonParser, async (req, res) => {
  try {
    await connection.beginTransaction();

    const [[{ count }]] = await connection.query(`
      SELECT COUNT(*) AS count
      FROM games
    `);

    const shouldFetchFromApi = count === 0;

    if (shouldFetchFromApi) {
      const games = await getGames(accessToken);

      for (const game of games) {
        await connection.query(
          `
          INSERT INTO games (
            id,
            name,
            summary,
            cover_id,
            cover_image_id,
            cover_url,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            summary = VALUES(summary),
            cover_id = VALUES(cover_id),
            cover_image_id = VALUES(cover_image_id),
            cover_url = VALUES(cover_url),
            created_at = VALUES(created_at),
            updated_at = VALUES(updated_at)
          `,
          [
            game.id,
            game.name,
            game.summary ?? null,
            game.cover?.id ?? null,
            game.cover?.image_id ?? null,
            game.cover?.url ?? null,
            game.created_at ?? null,
            game.updated_at ?? null,
          ],
        );

        if (Array.isArray(game.genres)) {
          for (const genre of game.genres) {
            await connection.query(
              `
              INSERT INTO genres (
                id,
                name,
                slug,
                url,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                slug = VALUES(slug),
                url = VALUES(url),
                created_at = VALUES(created_at),
                updated_at = VALUES(updated_at)
              `,
              [
                genre.id,
                genre.name,
                genre.slug ?? null,
                genre.url ?? null,
                genre.created_at ?? null,
                genre.updated_at ?? null,
              ],
            );

            await connection.query(
              `
              INSERT IGNORE INTO game_genres (
                game_id,
                genre_id
              )
              VALUES (?, ?)
              `,
              [game.id, genre.id],
            );
          }
        }

        if (Array.isArray(game.platforms)) {
          for (const platform of game.platforms) {
            await connection.query(
              `
              INSERT INTO platforms (
                id,
                name,
                abbreviation,
                alternative_name,
                slug,
                url,
                platform_type,
                created_at,
                updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                abbreviation = VALUES(abbreviation),
                alternative_name = VALUES(alternative_name),
                slug = VALUES(slug),
                url = VALUES(url),
                platform_type = VALUES(platform_type),
                created_at = VALUES(created_at),
                updated_at = VALUES(updated_at)
              `,
              [
                platform.id,
                platform.name,
                platform.abbreviation ?? null,
                platform.alternative_name ?? null,
                platform.slug ?? null,
                platform.url ?? null,
                platform.platform_type ?? null,
                platform.created_at ?? null,
                platform.updated_at ?? null,
              ],
            );

            await connection.query(
              `
              INSERT IGNORE INTO game_platforms (
                game_id,
                platform_id
              )
              VALUES (?, ?)
              `,
              [game.id, platform.id],
            );
          }
        }
      }
    }

    const [savedGames] = await connection.query(`
      SELECT
        g.id,
        g.name,
        g.summary,
        g.cover_id,
        g.cover_image_id,
        g.cover_url,
        g.created_at,
        g.updated_at,

        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', ge.id,
                'name', ge.name,
                'slug', ge.slug,
                'url', ge.url
              )
            )
            FROM game_genres gg
            INNER JOIN genres ge
              ON gg.genre_id = ge.id
            WHERE gg.game_id = g.id
          ),
          JSON_ARRAY()
        ) AS genres,

        COALESCE(
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', p.id,
                'name', p.name,
                'abbreviation', p.abbreviation,
                'alternative_name', p.alternative_name,
                'slug', p.slug,
                'url', p.url,
                'platform_type', p.platform_type
              )
            )
            FROM game_platforms gp
            INNER JOIN platforms p
              ON gp.platform_id = p.id
            WHERE gp.game_id = g.id
          ),
          JSON_ARRAY()
        ) AS platforms

      FROM games g
      ORDER BY g.updated_at DESC
    `);

    await connection.commit();

    return res.status(200).json({
      success: true,
      fromApi: shouldFetchFromApi,
      data: savedGames,
    });
  } catch (error) {
    await connection.rollback();

    console.error(error);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "게임 정보를 가져오는 중 오류가 발생했습니다.",
    });
  }
});

app.get("/getgamesageratings", jsonParser, async (req, res) => {
  try {
    const gameageratings = await getGamesAgeRatings(accessToken);
    return res.status(200).json({
      success: true,
      message: "Games retrieved successfully",
      source: "igdb",
      data: gameageratings,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
});

app.post("/addChatRoom", jsonParser, async (req, res) => {
  const { title, userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "userId is required",
    });
  }
  try {
    const [roomResult] = await connection.query(
      `
      INSERT INTO chat_room
      (
        title
      )
      VALUES (?)
      `,
      [title],
    );
    const roomId = roomResult?.insertId;

    const [result] = await connection.query(
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
});

app.get("/getChatRooms", async (req, res) => {
  try {
    const [chatRooms] = await connection.query(`
      SELECT
          cr.id,
          cr.title,
          cr.created_at,
          cr.updated_at,

          JSON_ARRAYAGG(
              JSON_OBJECT(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'imgUri', u.imgUri,
                  'accountType', u.accountType,
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
});

app.post("/joinChatRoom", jsonParser, async (req, res) => {
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
    const [roomRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id
      FROM chat_room
      WHERE id = ?
      LIMIT 1
      `,
      [roomId],
    );

    if (roomRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "CHAT_ROOM_NOT_FOUND",
        message: "Chat room not found",
      });
    }

    const [userRows] = await connection.query<RowDataPacket[]>(
      `
      SELECT id
      FROM user
      WHERE id = ?
      LIMIT 1
      `,
      [userId],
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

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

    if (memberRows.length > 0) {
      return res.status(409).json({
        success: false,
        code: "ALREADY_JOINED",
        message: "User has already joined this chat room",
      });
    }
    //////

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
});

app.post("/addChat", jsonParser, async (req, res) => {
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
    const [memberRows] = await connection.query(
      `
        SELECT room_id, user_id
        FROM chat_room_member
        WHERE room_id = ?
          AND user_id = ?
        LIMIT 1
      `,
      [roomId, senderId],
    );

    if (memberRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "해당 채팅방에 참여한 사용자만 메시지를 보낼 수 있습니다.",
      });
    }

    const [insertResult] = await connection.query(
      `
        INSERT INTO chat_message (
          room_id,
          sender_id,
          message
        )
        VALUES (?, ?, ?)
      `,
      [roomId, senderId, trimmedMessage],
    );

    const [messageRows] = await connection.query(
      `
        SELECT
          cm.id,
          cm.room_id AS roomId,
          cm.sender_id AS senderId,
          cm.message,
          cm.created_at AS createdAt,
          cm.updated_at AS updatedAt,
          u.name AS senderName,
          u.imgUri AS senderImage
        FROM chat_message cm

        INNER JOIN user u
          ON u.id = cm.sender_id

        WHERE cm.id = ?
        LIMIT 1
      `,
      [insertResult.insertId],
    );

    return res.status(201).json({
      success: true,
      message: "메시지가 생성되었습니다.",
      data: messageRows[0],
    });
  } catch (error) {
    console.error("addChat error:", error);

    return res.status(500).json({
      success: false,
      message: "메시지 생성 중 오류가 발생했습니다.",
    });
  }
});

app.get("/getChats", async (req, res) => {
  try {
    const { roomId, cursor, limit = 30 } = req.query;

    const queryParams = [roomId];
    let cursorCondition = "";

    if (cursor) {
      cursorCondition = "AND id < ?";
      queryParams.push(cursor);
    }

    queryParams.push(Number(limit) + 1);

    const [rows] = await connection.query(
      `
      SELECT
          *
      FROM chat_message
      WHERE room_id = ?
        ${cursorCondition}
      ORDER BY id DESC
      LIMIT ?
    `,
      queryParams,
    );

    const hasNextPage = rows.length > limit;

    const messages = hasNextPage ? rows.slice(0, limit) : rows;

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
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
