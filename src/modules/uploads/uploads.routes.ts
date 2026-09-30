import { Router } from "express";
import { jsonParser } from "../../middleware/parsers.ts";
import { upload } from "./uploads.controller.ts";

export const uploadsRouter = Router();

uploadsRouter.post("/upload", jsonParser, upload);
