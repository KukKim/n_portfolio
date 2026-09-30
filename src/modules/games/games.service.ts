import { connection } from "../../infra/database.ts";
import {
  accessToken,
  getGames,
  getGamesAgeRatings,
} from "../../infra/twitch.ts";
import {
  countGames,
  findSavedGames,
  linkGameGenre,
  linkGamePlatform,
  upsertGame,
  upsertGenre,
  upsertPlatform,
} from "./games.repository.ts";

// TODO: AI로 만든 코드 이해 필요
// 저장된 게임이 하나도 없을 때만 IGDB API 를 호출해 DB 에 채워 넣고,
// 그 뒤 DB 에 저장된 목록을 돌려줍니다. 전체가 하나의 트랜잭션입니다.
export async function getGamesFromDb() {
  try {
    await connection.beginTransaction();

    const count = await countGames();

    const shouldFetchFromApi = count === 0;

    if (shouldFetchFromApi) {
      const games = await getGames(accessToken);

      for (const game of games) {
        await upsertGame(game);

        if (Array.isArray(game.genres)) {
          for (const genre of game.genres) {
            await upsertGenre(genre);

            await linkGameGenre(game.id, genre.id);
          }
        }

        if (Array.isArray(game.platforms)) {
          for (const platform of game.platforms) {
            await upsertPlatform(platform);

            await linkGamePlatform(game.id, platform.id);
          }
        }
      }
    }

    const savedGames = await findSavedGames();

    await connection.commit();

    return { shouldFetchFromApi, savedGames };
  } catch (error) {
    await connection.rollback();

    throw error;
  }
}

export async function getAgeRatings() {
  return await getGamesAgeRatings(accessToken);
}
