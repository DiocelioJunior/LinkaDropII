// routes/register.js
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");

module.exports = function (db) {
  const router = express.Router();

  // --- Middleware: só admin acessa ---
  function checkAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) {
      console.warn("⛔ Tentativa de acesso ao cadastro sem ser admin");
      return res.redirect("/index.html");
    }
    next();
  }

  // --- GET /register ---
  router.get("/register", checkAdmin, (req, res) => {
    res.sendFile("register.html", {
      root: path.join(__dirname, "../views/admin")
    });
  });

  // --- POST /addClient ---
  router.post("/addClient", checkAdmin, async (req, res) => {
    const { name, email, password, ...resto } = req.body;

    try {
      // validações básicas
      if (!name || !email || !password) {
        console.warn("⚠️ Tentativa de cadastro com dados incompletos:", req.body);
        return res.status(400).send("⚠️ Nome, email e senha são obrigatórios");
      }

      // validação básica de email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.warn("⚠️ Email inválido no cadastro:", email);
        return res.status(400).send("⚠️ Email inválido");
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const dadosExtras = JSON.stringify(resto);

      db.query(
        "INSERT INTO dropers (name, email, password, dados) VALUES (?, ?, ?, ?)",
        [name, email, hashedPassword, dadosExtras],
        (err) => {
          if (err) {
            console.error("❌ Erro ao inserir no MySQL:", err);
            return res.status(500).send("Erro ao cadastrar cliente");
          }

          console.log(`✅ Novo cliente cadastrado: ${name} <${email}>`);
          return res.redirect("/admin/users");
        }
      );
    } catch (err) {
      console.error("❌ Erro inesperado no cadastro:", err);
      res.status(500).send("Erro interno no servidor");
    }
  });

  return router;
};
