import type { RowDataPacket } from "mysql2";
import { connection } from "../../infra/database.ts";

type IgdbGame = {
  id: unknown;
  name: unknown;
  summary?: unknown;
  cover?: { id?: unknown; image_id?: unknown; url?: unknown } | null;
  created_at?: unknown;
  updated_at?: unknown;
};

type IgdbGenre = {
  id: unknown;
  name: unknown;
  slug?: unknown;
  url?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type IgdbPlatform = {
  id: unknown;
  name: unknown;
  abbreviation?: unknown;
  alternative_name?: unknown;
  slug?: unknown;
  url?: unknown;
  platform_type?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

export async function countGames() {
  const [[{ count }]] = await connection.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS count
    FROM games
  `);

  return count;
}

export async function upsertGame(game: IgdbGame) {
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
}

export async function upsertGenre(genre: IgdbGenre) {
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
}

export async function linkGameGenre(gameId: unknown, genreId: unknown) {
  await connection.query(
    `
    INSERT IGNORE INTO game_genres (
      game_id,
      genre_id
    )
    VALUES (?, ?)
    `,
    [gameId, genreId],
  );
}

export async function upsertPlatform(platform: IgdbPlatform) {
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
}

export async function linkGamePlatform(gameId: unknown, platformId: unknown) {
  await connection.query(
    `
    INSERT IGNORE INTO game_platforms (
      game_id,
      platform_id
    )
    VALUES (?, ?)
    `,
    [gameId, platformId],
  );
}

export async function findSavedGames() {
  const [savedGames] = await connection.query<RowDataPacket[]>(`
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

  return savedGames;
}
