const express = require("express");
const { Router } = express;
const route = new Router();
const {
  renderLoginPage,
  renderRegisterPage,
} = require("../controllers/mainControllers.js");
const productsRoutes = require("./products.routes.js");
const cartsRoutes = require("./carts.routes.js");
const authRoutes = require("./auth.routes.js");
const swaggerRoutes = require("./swagger.routes.js");

// Monta las rutas de autenticación
route.use(`${process.env.BASE_URL}/api/sessions`, authRoutes);

// Monta las rutas de productos
route.use(`${process.env.BASE_URL}/api/products`, productsRoutes);

// Monta las rutas de carritos
route.use(`${process.env.BASE_URL}/api/carts`, cartsRoutes);

// Rutas exclusivas para Swagger sin autenticación
route.use(`${process.env.BASE_URL}/api/swagger`, swaggerRoutes);

// Rutas para las páginas de inicio de sesión y registro
route.get(`${process.env.BASE_URL}/`, renderLoginPage);
route.get(`${process.env.BASE_URL}/login`, renderLoginPage);
route.get(`${process.env.BASE_URL}/register`, renderRegisterPage);

module.exports = route;
