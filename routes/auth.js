// routes/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

module.exports = function (db) {
  const router = express.Router();

 // --- Admin controlado pelo .env ---
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  // --- POST /login ---
  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    // Verificação ADMIN
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      req.session.user = {
        id: 0,
        name: "Administrador",
        email: ADMIN_EMAIL,
        isAdmin: true,
      };
      console.log("✅ Login admin:", email);
      return res.redirect("/admin/home");
    }

    // Verificação de usuários comuns
    db.query("SELECT * FROM dropers WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("❌ Erro MySQL:", err);
        return res.status(500).send("Erro no servidor");
      }
      if (results.length === 0) {
        console.warn("⚠️ Usuário não encontrado:", email);
        return res.sendFile("index.html", { root: path.join(__dirname, "../public") });
      }

      const user = results[0];

      if (!password || !user.password) {
        console.warn("⚠️ Falha de login: senha ou hash ausente", {
          passwordRecebida: !!password,
          hashNoBanco: !!user.password,
        });
        return res.sendFile("index.html", { root: path.join(__dirname, "../public") });
      }

      try {
        const senhaCorreta = await bcrypt.compare(password, user.password);
        if (!senhaCorreta) {
          console.warn("⚠️ Senha incorreta para:", email);
          return res.sendFile("index.html", { root: path.join(__dirname, "../public") });
        }

        req.session.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: false,
        };

        console.log("✅ Login usuário:", user.email);
        res.redirect("/dashboard");
      } catch (err) {
        console.error("❌ Erro no bcrypt.compare:", err);
        res.status(500).send("Erro interno no login");
      }
    });
  });

  // --- GET /logout ---
  router.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) {
        console.error("❌ Erro ao fazer logout:", err);
        return res.status(500).send("Erro ao encerrar a sessão");
      }
      res.clearCookie("connect.sid");
      console.log("👋 Logout realizado com sucesso");
      res.sendFile("index.html", { root: path.join(__dirname, "../public") });
    });
  });

  return router;
};

