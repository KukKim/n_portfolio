import { Router } from "express";
import { jsonParser } from "../../middleware/parsers.ts";
import { getGames, getGamesAgeRatings } from "./games.controller.ts";

export const gamesRouter = Router();

gamesRouter.get("/getgames", jsonParser, getGames);
gamesRouter.get("/getgamesageratings", jsonParser, getGamesAgeRatings);
