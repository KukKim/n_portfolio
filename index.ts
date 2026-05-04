// Get the client
import mysql from "mysql2/promise";
import express from "express";
import bodyParser from "body-parser";

// Create the connection to database
const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "portfolio",
  password: "sotus7",
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
    const [result] = await connection.query(
      "INSERT INTO user (name, email, imgUri, password) VALUE ('" +
        name +
        "', '" +
        email +
        "', '" +
        imgUri +
        "', '" +
        password +
        "');",
    );

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      data: { userId: result.insertId },
    });
  } catch (err) {
    console.error(err);
    if (err.code === "ER_DUP_ENTRY") {
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
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
