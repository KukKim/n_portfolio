import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT;

export const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
};

export const S3_REGION = "ap-northeast-2";
export const S3_BUCKET = "dk-portfolio-300536574903-ap-northeast-2-an";

export const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
export const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
