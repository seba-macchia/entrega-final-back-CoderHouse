const express = require("express");
const { Router } = express;
const passport = require("passport");
const route = new Router();
const UserService = require("../services/userService");
const userService = new UserService();
const ObjectId = require("mongoose").Types.ObjectId;
const { authenticateToken } = require("../middleware/authMiddleware");
const {
  register,
  login,
  loginGithub,
  loginGithubCallback,
  logout,
  getCurrentUser,
} = require("../controllers/authControllers");

route.post("/register", register);
route.post("/login", login);
route.get("/login_github", loginGithub);
route.get(
  "/login_github/callback",
  passport.authenticate("login_github", {
    session: false,
  }),
  loginGithubCallback
);
route.post("/logout", logout);
// Ruta para mostrar el perfil actual
route.get("/current", authenticateToken, getCurrentUser);

module.exports = route;
