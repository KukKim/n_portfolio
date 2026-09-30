import { connection } from "../../infra/database.ts";

export async function updateUserPushToken(
  column: string,
  pushToken: unknown,
  id: unknown,
) {
  await connection.query(`UPDATE user SET ${column} = ? WHERE id = ?`, [
    pushToken,
    id,
  ]);
}

export async function updateUserFields(
  setClause: string,
  values: unknown[],
  id: unknown,
) {
  await connection.query(`UPDATE user SET ${setClause} WHERE id = ?`, [
    ...values,
    id,
  ]);
}
