import type { Request, Response } from "express";
import { getAgeRatings, getGamesFromDb } from "./games.service.ts";

export async function getGames(req: Request, res: Response) {
  try {
    const { shouldFetchFromApi, savedGames } = await getGamesFromDb();

    return res.status(200).json({
      success: true,
      fromApi: shouldFetchFromApi,
      data: savedGames,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      code: "SERVER_ERROR",
      message: "게임 정보를 가져오는 중 오류가 발생했습니다.",
    });
  }
}

export async function getGamesAgeRatings(req: Request, res: Response) {
  try {
    const gameageratings = await getAgeRatings();

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
}
