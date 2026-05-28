// Get the client
import mysql from "mysql2/promise";
import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";

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

app.post("/check", jsonParser, async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "TOKEN_REQUIRED",
      message: "Token is required",
    });
  }
  try {
    const [users] = await connection.query(
      "SELECT idx, name, email, imgUri, token, loginDate, expireDate FROM user WHERE token = ?",
      [token],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid token",
      });
    }

    const user = users[0];
    const now = new Date();
    const expireDate = new Date(user.expireDate);

    if (expireDate < now) {
      await connection.query(
        `
        UPDATE user
        SET token = NULL
        WHERE idx = ?
        `,
        [user.idx],
      );

      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Token has expired. Please sign in again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      data: {
        // userId: user.idx,
        // name: user.name,
        // email: user.email,
        // imgUri: user.imgUri,
        // token: user.token,
        // loginDate: user.loginDate,
        // expireDate: user.expireDate,
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
});

// TODO: 후에 POST 로 변경 필요. POST에서 SSL로 변경
app.get("/signin", jsonParser, async (req, res) => {
  const { email, password } = req.query;
  try {
    const [users] = await connection.query(
      "SELECT * FROM user WHERE email = '" +
        email +
        "' AND password = '" +
        password +
        "';",
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const loginDate = new Date();
    const expireDate = new Date(loginDate);
    expireDate.setDate(expireDate.getDate() + 100);

    await connection.query(
      "UPDATE user SET loginDate = ?, token = ?, expireDate = ? WHERE idx = ?",
      [loginDate, token, expireDate, user.idx],
    );

    return res.status(200).json({
      success: true,
      message: "Signin successful",
      data: {
        name: user.name,
        imgUri: user.imgUri,
        token,
        loginDate,
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
});

app.post("/signup", jsonParser, async (req, res) => {
  const { name, email, imgUri, password, accountType } = req.body;
  try {
    const token = crypto.randomBytes(32).toString("hex");
    const loginDate = new Date();
    const expireDate = new Date(loginDate);
    expireDate.setDate(expireDate.getDate() + 100);
    const [result] = await connection.query(
      `
      INSERT INTO user
      (
        name,
        email,
        imgUri,
        password,
        token,
        loginDate,
        expireDate,
        accountType
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        email,
        imgUri,
        password,
        token,
        loginDate,
        expireDate,
        accountType,
      ],
    );
    return res.status(201).json({
      success: true,
      message: "Signup successful",
      data: { userId: result.insertId, token, name, email, imgUri },
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

app.post("/registerpushtoken", jsonParser, async (req, res) => {
  const { pushtoken, platform } = req.body;
  try {
    const [result] = await connection.query(
      "UPDATE user SET ? = ? WHERE idx = ?",
      [
        platform == "ios" ? "iosPushToken" : "androidPushToken",
        pushtoken,
        req.user.idx,
      ],
    );

    return res.status(200).json({
      success: true,
      message: "Push token registered successfully",
    });
  } catch (err) {
    console.error(err);
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
