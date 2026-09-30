import { Router } from "express";
import { jsonParser } from "../../middleware/parsers.ts";
import { registerPushToken, updateUserInfo } from "./users.controller.ts";

export const usersRouter = Router();

usersRouter.post("/registerpushtoken", jsonParser, registerPushToken);
usersRouter.patch("/updateuserinfo", jsonParser, updateUserInfo);
