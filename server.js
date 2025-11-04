require("dotenv").config(); // lê as variáveis do .env
const express = require("express");
const path = require("path");
const session = require("express-session");
const mysql = require("mysql2");
const MySQLStore = require("express-mysql-session")(session);
const { requireClientLogin } = require("./middlewares/clientAuth");

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------- Conexão MySQL -------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) console.error("❌ Erro MySQL:", err);
  else console.log("✅ Conectado ao MySQL!");
});

// ------------------- Session Store -------------------
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 1000 * 60 * 10,
  expiration: 1000 * 60 * 60,
});

app.use(session({
  key: "gwa_session_id",
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.SECURE_COOKIE === "true",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60,
  },
}));

// ------------------- Middlewares -------------------
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "public", "uploads")));

// Evita cache em rotas autenticadas
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Middleware para admin
function checkAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.redirect("/"); // redireciona para login
  }
  next();
}

// ------------------- Rotas -------------------
const authRoutes = require("./routes/auth")(db);
const registerRoutes = require("./routes/register")(db);
const dashboardRoutes = require("./routes/dashboard")(db);
const adminRoutes = require("./routes/admin")(db);
const productsRoutes = require("./routes/products")(db);
const clientsRoutes = require("./routes/clients")(db);
const clientAuthRoutes = require("./routes/clientAuth")(db);
const ordersRoutes = require("./routes/orders")(db);
const droperConfigRoutes = require("./routes/storeConfig")(db);
const storeConfigRoutes = require("./routes/storeConfig")(db);

app.use("/", ordersRoutes);
app.use("/", clientAuthRoutes);
app.use("/", authRoutes);
app.use("/", registerRoutes);
app.use("/", dashboardRoutes);
app.use("/", adminRoutes);
app.use("/", productsRoutes);
app.use("/", clientsRoutes);
app.use("/", droperConfigRoutes);
app.use("/", storeConfigRoutes);

// API para identificar usuário logado
app.get("/api/session-user", (req, res) => {
  if (req.session.user) {
    res.json({
      id: req.session.user.id,
      name: req.session.user.name,
      email: req.session.user.email,
      isAdmin: req.session.user.isAdmin || false
    });
  } else {
    res.status(401).json({ error: "Usuário não autenticado" });
  }
});

// Fallback login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Protege acesso à loja dos droppers
app.get("/clients/store/:droperId", requireClientLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/clients/store.html"));
});

// Página do admin
app.get("/admin/home", checkAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin/admin.html"));
});

// ------------------- Inicia servidor -------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});
