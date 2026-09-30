import type { Request, Response } from "express";
import { createUploadUrls } from "./uploads.service.ts";

export async function upload(req: Request, res: Response) {
  const { fileName, fileType } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "fileName and fileType are required",
    });
  }

  try {
    const { uploadUrl, imageUrl } = await createUploadUrls(fileName, fileType);

    return res.status(200).json({
      success: true,
      message: "Upload URL generated successfully",
      data: { uploadUrl, imageUrl },
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
