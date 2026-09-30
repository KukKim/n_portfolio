import mysql from "mysql2/promise";
import { dbConfig } from "../config/env.ts";

// Create the connection to database
export const connection = await mysql.createConnection(dbConfig);
