// routes/dashboard.js
const express = require("express");

module.exports = function(db) { // recebe db para manter padrão
  const router = express.Router();

  router.get("/dashboard", (req, res) => {
    if (!req.session.user) {
      return res.send("⚠️ Você precisa estar logado! <a href='/'>Login</a>");
    }
    res.send(`Olá ${req.session.user.name}, você está logado!`);
  });

  return router;
};
