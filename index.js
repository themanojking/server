const express = require("express");
const app = express();
const cors = require("cors");
const pool = require("./db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const JWT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

app.use(express.json());
//middleware
app.use(
  cors({
    origin: "https://todo-gray-gamma.vercel.app/",
  })
);

//middleware to verify the JWT token and get user id
// const authenticateToken = (req, res, next ) => {
//     const token = req.header("Authorization") ?.replace("Bearer ","");
//     if(!token) {
//       return res.status(403).json({ error: "Access denied, no token provided "});
//     }
//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.userId = decoded.userId;
//         next();
//     } catch (error) {
//        return res.status(401).json({ error: "Invalid or expired token "});
//     }
// };
const authenticateToken = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ error: "Access denied, no token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

//get data
app.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const response = await pool.query(
      "select * from records where user_id =$1",
      [req.userId]
    );
    res.status(200).json(response.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server errror " });
  }
});

//insert data
app.post("/tasks", authenticateToken, async (req, res) => {
  const { rec_text } = req.body;
  try {
    const result = await pool.query(
      "insert into records (rec_text,rec_status,user_id) values ($1,'false',$2) returning *",
      [rec_text, req.userId]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to insert record " });
  }
});

//delete data
app.delete("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("delete from records where rec_id=$1", [id]);
    res.status(200).json({ message: "Task deleted " });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error" });
  }
});

//status data
app.put("/tasks/:id/status", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "update records set rec_status = NOT rec_status where rec_id =$1 returning *",
      [id]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "Failed to toggle status" });
  }
});

//see user details in browser
app.get("/", async (req, res) => {
  try {
    const data = await pool.query("select * from users");
    res.status(200).json(data.rows);
  } catch (error) {
    console.log(error.message);
  }
});

//user create account
app.post("/register", async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const hashPassword = await bcrypt.hash(password, 10);
    const response = await pool.query(
      "insert into users (user_fullname,user_email,user_password) values ($1,$2,$3) returning *",
      [fullName, email, hashPassword]
    );
    res.status(200).json(response.rows[0]);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to register user" });
  }
});

//user login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const response = await pool.query(
      "SELECT * FROM users WHERE user_email = $1",
      [email]
    );

    if (response.rows.length === 0) {
      return res.status(400).json({ error: "The Email does not exist" });
    }

    const validPassword = await bcrypt.compare(
      password,
      response.rows[0].user_password
    );

    if (!validPassword) {
      return res.status(400).json({ error: "Password Invalid" });
    }

    const token = jwt.sign(
      {
        userId: response.rows[0].user_id,
      },
      JWT_SECRET,
      { expiresIn: "10d" }
    );

    // res.json({ token });
    console.log(token);
    res.status(200).json({ message: "Login Successfully", token });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Failed to login" });
  }
});

//start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("The server is running in " + PORT);
});
