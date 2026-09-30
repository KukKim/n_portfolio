import { Router } from "express";
import { jsonParser } from "../../middleware/parsers.ts";
import { check, signin, signup } from "./auth.controller.ts";

export const authRouter = Router();

authRouter.post("/check", jsonParser, check);
// TODO: 후에 POST 로 변경 필요. POST에서 SSL로 변경
authRouter.get("/signin", jsonParser, signin);
authRouter.post("/signup", jsonParser, signup);
