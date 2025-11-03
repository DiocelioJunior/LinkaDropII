function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/index.html");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.isAdmin) {
    return res.redirect("/index.html");
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
