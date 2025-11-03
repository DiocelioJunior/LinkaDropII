// routes/dashboard.js
const express = require("express");
const path = require("path");

module.exports = function () {
  const router = express.Router();

  router.get("/dashboard", (req, res) => {
    if (!req.session.user) {
      return res.redirect("/index.html");
    }

    console.log(`📂 Servindo dashboard para usuário: ${req.session.user.email}`);

    res.sendFile("droper-dashboard.html", {
      root: path.join(__dirname, "../views/droper")
    }, (err) => {
      if (err) {
        console.error("❌ Erro no sendFile:", err);
        res.status(500).send("Erro ao carregar dashboard");
      }
    });
  });

  return router;
};
