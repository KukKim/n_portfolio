import type { Request, Response } from "express";
import { updateUserFields, updateUserPushToken } from "./users.repository.ts";

export async function registerPushToken(req: Request, res: Response) {
  const { pushToken, platform, id } = req.body;

  if (!pushToken || !id || !["ios", "android"].includes(platform)) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "pushToken, platform, id are required",
    });
  }

  const column = platform === "ios" ? "push_token_ios" : "push_token_android";

  try {
    await updateUserPushToken(column, pushToken, id);

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
}

export async function updateUserInfo(req: Request, res: Response) {
  const { id } = req.body;

  const fieldColumnMap: Record<string, string> = {
    name: "name",
    email: "email",
    imgUri: "image_uri",
    // password: "password",
    // token: "token",
    // loginDate: "login_at",
    // expireDate: "expires_at",
    // accountType: "account_type",
    pushTokenIOS: "push_token_ios",
    pushTokenAndroid: "push_token_android",
  };

  let setClause = "";
  const values: (string | null)[] = [];

  Object.keys(fieldColumnMap).forEach((field) => {
    if (req.body[field]) {
      setClause += `${fieldColumnMap[field]} = ?, `;
      values.push(req.body[field]);
    }
  });
  if (setClause === "") {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "At least one field to update is required",
    });
  }
  // Remove the trailing comma and space
  setClause = setClause.slice(0, -2);

  if (!id) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "id is required",
    });
  }
  try {
    await updateUserFields(setClause, values, id);

    return res.status(200).json({
      success: true,
      message: "User info updated successfully",
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
