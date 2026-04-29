// Get the client
import mysql from "mysql2/promise";
import express from "express";
import bodyParser from "body-parser";

// Create the connection to database
const connection = await mysql.createConnection({
  host: "host",
  user: "user",
  database: "database",
  password: "password",
});

const app = express();
const port = 3000;
// create application/json parser
const jsonParser = bodyParser.json();
// create application/x-www-form-urlencoded parser
const urlencodedParser = bodyParser.urlencoded();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/signup", jsonParser, async (req, res) => {
  const { name, email, imgUri, password } = req.body;
  try {
    const [results, fields] = await connection.query(
      "INSERT INTO user WHERE (name, email, imgUri, password) VALUE(" +
        name +
        ", " +
        email +
        ", " +
        imgUri +
        ", " +
        password +
        ")",
    );
    console.log(results); // results contains rows returned by server
    console.log(fields); // fields contains extra meta data about results, if available
    res.send("Signup successful!");
  } catch (err) {
    // console.log(err);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
