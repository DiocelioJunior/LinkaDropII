const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

module.exports = function(db) {

  // Middleware para checar se é admin
  function checkAdmin(req, res, next) {
    if (!req.session.user || !req.session.user.isAdmin) {
      return res.status(403).send("⛔ Acesso negado");
    }
    next();
  }

  // Middleware para desabilitar cache do navegador
  function noCache(req, res, next) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
  }

  // Serve o HTML do admin users
  router.get("/admin/users", checkAdmin, noCache, (req, res) => {
    res.sendFile("admin-user-dropers.html", { root: "./public" });
  });

router.get("/admin/users-json", checkAdmin, noCache, (req, res) => {
  db.query("SELECT id, name, email, created_at, dados FROM dropers", (err, results) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar usuários" });

    const users = results.map(user => {
      // Converte a string JSON para objeto
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

    // Mostra no console do Node.js
    console.log("USUÁRIOS:", users);

    res.json(users);
  });
});


  // Buscar usuário por ID
  router.get("/admin/users/:id", checkAdmin, noCache, (req, res) => {
    const { id } = req.params;
    db.query("SELECT id, name, email FROM dropers WHERE id = ?", [id], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
      res.json(results[0]);
    });
  });

  // Serve o HTML de edição
  router.get("/admin/edit", checkAdmin, noCache, (req, res) => {
    res.sendFile("admin-edit.html", { root: "./public" });
  });

  // Buscar usuário por ID (todos os dados)
router.get("/admin/users/:id", checkAdmin, noCache, (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM dropers WHERE id = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json(results[0]); // retorna todos os campos
  });
});


  // Atualizar usuário
  router.put("/admin/users/:id", checkAdmin, (req, res) => {
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
      console.error(err);
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
