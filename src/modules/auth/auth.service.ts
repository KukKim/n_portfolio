import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import {
  clearUserToken,
  findUserByEmailAndPassword,
  findUserByToken,
  insertUser,
  updateUserSignin,
} from "./auth.repository.ts";

type VerifyTokenResult =
  | { status: "INVALID_TOKEN" }
  | { status: "TOKEN_EXPIRED" }
  | { status: "VALID"; user: RowDataPacket };

export async function verifyToken(token: unknown): Promise<VerifyTokenResult> {
  const users = await findUserByToken(token);

  if (users.length === 0) {
    return { status: "INVALID_TOKEN" };
  }

  const user = users[0];
  const now = new Date();
  const expireDate = new Date(user.expires_at);

  if (expireDate < now) {
    await clearUserToken(user.id);

    return { status: "TOKEN_EXPIRED" };
  }

  return { status: "VALID", user };
}

export async function signin(email: unknown, password: unknown) {
  const users = await findUserByEmailAndPassword(email, password);

  if (users.length === 0) {
    return null;
  }

  const user = users[0];
  const token = crypto.randomBytes(32).toString("hex");
  const loginDate = new Date();
  const expireDate = new Date(loginDate);
  expireDate.setDate(expireDate.getDate() + 100);

  await updateUserSignin(loginDate, token, expireDate, user.id);

  return {
    id: user.id,
    name: user.name,
    imgUri: user.image_uri,
    token,
    loginDate,
  };
}

export async function signup(params: {
  name: unknown;
  email: unknown;
  imgUri: unknown;
  password: unknown;
  accountType: unknown;
}) {
  const { name, email, imgUri, password, accountType } = params;

  const token = crypto.randomBytes(32).toString("hex");
  const loginDate = new Date();
  const expireDate = new Date(loginDate);
  expireDate.setDate(expireDate.getDate() + 100);

  const result = await insertUser([
    name,
    email,
    imgUri,
    password,
    token,
    loginDate,
    expireDate,
    accountType,
  ]);

  return { id: result.insertId, token, name, email, imgUri };
}
