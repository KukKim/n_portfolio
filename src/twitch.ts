import dotenv from "dotenv";
dotenv.config();
// igdb.js

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

export async function getAccessToken() {
  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    {
      method: "POST",
    },
  );

  const data = await response.json();
  return data.access_token;
}

export async function getGames(accessToken: string) {
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: `fields name,cover.*,summary,created_at,updated_at,genres.*,platforms.*,screenshots; sort created_at desc; limit 20;`,
  });
  const data = await response.json();
  return data;
}

export async function getGamesAgeRatings(accessToken: string) {
  const response = await fetch("https://api.igdb.com/v4/age_ratings", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "fields category,checksum,content_descriptions,organization,rating,rating_category,rating_content_descriptions,rating_cover_url,synopsis;",
  });
  const data = await response.json();
  return data;
}
