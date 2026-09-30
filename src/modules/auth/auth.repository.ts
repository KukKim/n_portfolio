import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { connection } from "../../infra/database.ts";

export async function findUserByToken(token: unknown) {
  const [users] = await connection.query<RowDataPacket[]>(
    "SELECT id, name, email, image_uri, token, login_at, expires_at FROM user WHERE token = ?",
    [token],
  );

  return users;
}

export async function clearUserToken(id: unknown) {
  await connection.query(
    `
    UPDATE user
    SET token = NULL
    WHERE id = ?
    `,
    [id],
  );
}

export async function findUserByEmailAndPassword(
  email: unknown,
  password: unknown,
) {
  const [users] = await connection.query<RowDataPacket[]>(
    "SELECT * FROM user WHERE email = '" +
      email +
      "' AND password = '" +
      password +
      "';",
  );

  return users;
}

export async function updateUserSignin(
  loginDate: Date,
  token: string,
  expireDate: Date,
  id: unknown,
) {
  await connection.query(
    "UPDATE user SET login_at = ?, token = ?, expires_at = ? WHERE id = ?",
    [loginDate, token, expireDate, id],
  );
}

export async function insertUser(values: unknown[]) {
  const [result] = await connection.query<ResultSetHeader>(
    `
    INSERT INTO user
    (
      name,
      email,
      image_uri,
      password,
      token,
      login_at,
      expires_at,
      account_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    values,
  );

  return result;
}
