require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const mysql = require("mysql2");
const path = require("path");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Banco de dados ---
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// --- Sessão ---
const sessionStore = new MySQLStore({}, db.promise());

app.use(
  session({
    key: "session_cookie",
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 }, // 1 dia
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Rotas ---
app.use("/auth", authRoutes(db));

// --- Frontend ---
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => console.log(`✅ Servidor rodando na porta ${PORT}`));
