import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { connection } from "../../infra/database.ts";

export interface AuthUserRow extends RowDataPacket {
  id: number;
  name: string | null;
  email: string | null;
  image_uri: string | null;
  account_type: string;
}

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

export async function findOrCreateGithubUser(params: {
  githubId: string;
  name: string;
  imgUri: string;
}): Promise<AuthUserRow> {
  await connection.query(
    `
    INSERT INTO user (
      name,
      email,
      image_uri,
      password,
      account_type,
      oauth_provider,
      oauth_subject
    )
    VALUES (?, NULL, ?, NULL, 'SOCIAL', 'github', ?)
    ON DUPLICATE KEY UPDATE id = id
    `,
    [params.name, params.imgUri, params.githubId],
  );

  const [users] = await connection.query<AuthUserRow[]>(
    `
    SELECT id, name, email, image_uri, account_type
    FROM user
    WHERE oauth_provider = ?
      AND oauth_subject = ?
    LIMIT 1
    `,
    ["github", params.githubId],
  );

  if (!users[0]) {
    throw new Error("GitHub 회원 조회 또는 생성에 실패했습니다.");
  }

  return users[0];
}
