const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const mysql = require("mysql2");

const app = express();
const PORT = 3000;

// ------------------- MIDDLEWARE -------------------
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: "segredo_super_seguranca",
  resave: false,
  saveUninitialized: true
}));

// ------------------- CONEXÃO MYSQL -------------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Dio25069",
  database: "gwa_db"
});

db.connect(err => {
  if (err) console.error("❌ Erro MySQL:", err);
  else console.log("✅ Conectado ao MySQL!");
});

// ------------------- ROTAS -------------------
// Aqui passamos o db para cada rota que precisa dele
const authRoutes = require("./routes/auth")(db);
const registerRoutes = require("./routes/register")(db);
const dashboardRoutes = require("./routes/dashboard")(db);
const adminRoutes = require("./routes/admin")(db); // 

app.use("/", authRoutes);
app.use("/", registerRoutes);
app.use("/", dashboardRoutes);
app.use("/", adminRoutes);

// ------------------- INICIA SERVIDOR -------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});
