function requireClientLogin(req, res, next) {
  const droperId = parseInt(req.params.droperId);
  if (!req.session.client) {
    console.log("⛔ Cliente tentou acessar loja sem login");
    return res.redirect(`/clients/login/${droperId || 1}`);
  }

  if (req.session.client.droper_id !== droperId) {
    console.log("🚫 Cliente tentou acessar loja errada");
    return res.status(403).send("Acesso negado a outra loja");
  }

  next();
}

module.exports = { requireClientLogin };
