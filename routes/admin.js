// routes/admin.js
const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");

const router = express.Router();

module.exports = function (db) {
  // --- Middlewares ---
  function checkAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.redirect("/index.html"); // redireciona para login
    }
    next();
  }

  function noCache(req, res, next) {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  }

  // --- Rotas protegidas ---
  // Página: lista de usuários
  router.get("/admin/users", checkAdmin, noCache, (req, res) => {
    res.sendFile("admin-user-dropers.html", {
      root: path.join(__dirname, "../views/admin")
    });
  });

  // Página: edição
  router.get("/admin/edit", checkAdmin, noCache, (req, res) => {
    res.sendFile("admin-edit.html", {
      root: path.join(__dirname, "../views/admin")
    });
  });

  // Página: home do admin
  router.get("/admin/home", checkAdmin, noCache, (req, res) => {
    res.sendFile("admin.html", {
      root: path.join(__dirname, "../views/admin")
    });
  });

  // --- API ---
  // Listar todos usuários
  router.get("/admin/users-json", checkAdmin, noCache, (req, res) => {
    db.query("SELECT id, name, email, created_at, dados FROM dropers", (err, results) => {
      if (err) return res.status(500).json({ error: "Erro ao buscar usuários" });

      const users = results.map(user => {
        if (user.dados && typeof user.dados === "string") {
          try {
            user.dados = JSON.parse(user.dados);
          } catch (e) {
            console.error("Erro ao parsear dados JSON:", e);
            user.dados = {};
          }
        } else if (!user.dados) {
          user.dados = {};
        }
        return user;
      });

      res.json(users);
    });
  });

  // Buscar usuário por ID (dados básicos)
  router.get("/admin/users/:id", checkAdmin, noCache, (req, res) => {
    const { id } = req.params;
    db.query("SELECT id, name, email FROM dropers WHERE id = ?", [id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      res.json(results[0]);
    });
  });

  // Buscar usuário por ID (todos os dados)
  router.get("/admin/users/:id/full", checkAdmin, noCache, (req, res) => {
    const { id } = req.params;
    db.query("SELECT * FROM dropers WHERE id = ?", [id], (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      res.json(results[0]);
    });
  });

  // Atualizar usuário
  router.put("/admin/users/:id", checkAdmin, noCache, (req, res) => {
    const { id } = req.params;
    const { name, email, password } = req.body;

    try {
      let query = "UPDATE dropers SET name = ?, email = ? WHERE id = ?";
      let params = [name, email, id];

      if (password && password.trim() !== "") {
        bcrypt.hash(password, 10, (err, hashed) => {
          if (err) return res.status(500).json({ error: "Erro ao atualizar senha" });

          query = "UPDATE dropers SET name = ?, email = ?, password = ? WHERE id = ?";
          params = [name, email, hashed, id];

          db.query(query, params, (err) => {
            if (err) return res.status(500).json({ error: "Erro ao atualizar usuário" });
            res.json({ success: true });
          });
        });
      } else {
        db.query(query, params, (err) => {
          if (err) return res.status(500).json({ error: "Erro ao atualizar usuário" });
          res.json({ success: true });
        });
      }
    } catch (err) {
      console.error("❌ Erro interno:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // Deletar usuário
  router.delete("/admin/users/:id", checkAdmin, noCache, (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM dropers WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: "Erro ao excluir usuário" });
      res.json({ success: true });
    });
  });

  return router;
};
