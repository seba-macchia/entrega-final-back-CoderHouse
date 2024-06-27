const express = require("express");
const { Router } = express;
const passport = require("passport");
const route = new Router();
const UserService = require("../services/userService");
const userService = new UserService();
const ObjectId = require("mongoose").Types.ObjectId;
const {
  register,
  login,
  loginGithub,
  loginGithubCallback,
  logout,
  getCurrentUser,
} = require("../controllers/authControllers");
const UserDTO = require("../dao/dto/user.Dto");

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
route.get("/current", async (req, res) => {
  // Obtener datos del usuario y renderizar la página de perfil
  const userId = new ObjectId(req.session.user._id);
  const user = await userService.getUserById(userId);
  const userDto = new UserDTO(user);
  const data = userDto.getData();
  const isAdmin = data.role === "admin" ? true : false;
  req.session.user = user; // Aquí se debería obtener el usuario de la sesión o de la base de datos
  res.render("profile", { data, isAdmin });
});

module.exports = route;
