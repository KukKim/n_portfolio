import type { Request, Response } from "express";
import * as authService from "./auth.service.ts";

export async function check(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "TOKEN_REQUIRED",
      message: "Token is required",
    });
  }
  try {
    const result = await authService.verifyToken(token);

    if (result.status === "INVALID_TOKEN") {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid token",
      });
    }

    if (result.status === "TOKEN_EXPIRED") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Token has expired. Please sign in again.",
      });
    }

    const user = result.user;

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        id: user.id,
        // name: user.name,
        // email: user.email,
        // imgUri: user.image_uri,
        // token: user.token,
        // loginDate: user.login_at,
        // expireDate: user.expires_at,
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
}

export async function signin(req: Request, res: Response) {
  const { email, password } = req.query;
  try {
    const signedInUser = await authService.signin(email, password);

    if (signedInUser === null) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Signin successful",
      data: {
        id: signedInUser.id,
        name: signedInUser.name,
        imgUri: signedInUser.imgUri,
        token: signedInUser.token,
        loginDate: signedInUser.loginDate,
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
}

export async function signup(req: Request, res: Response) {
  const { name, email, imgUri, password, accountType } = req.body;
  try {
    const createdUser = await authService.signup({
      name,
      email,
      imgUri,
      password,
      accountType,
    });

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      data: {
        id: createdUser.id,
        token: createdUser.token,
        name: createdUser.name,
        email: createdUser.email,
        imgUri: createdUser.imgUri,
      },
    });
  } catch (err) {
    console.error(err);
    if ((err as { code?: string }).code === "ER_DUP_ENTRY") {
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
}
