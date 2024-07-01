const express = require("express");
const { Router } = express;
const { authenticateToken, isAdmin, isPremium, isAdminOrPremium } = require("../middleware/authMiddleware"); // Importar el middleware de autorización
const route = Router();
const {
  renderProductsPage,
  getAllProductsAPI,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  renderManagerPage,
  generateSimulatedProducts
} = require("../controllers/productsControllers");

route.get("/", authenticateToken, renderProductsPage);
route.get("/allProducts", authenticateToken, isAdminOrPremium, getAllProductsAPI);
route.get("/prodById/:productId", authenticateToken, getProductById);
route.get("/manager/", authenticateToken, isAdminOrPremium, renderManagerPage);
route.post("/createProd", authenticateToken, isAdminOrPremium, createProduct); // Aplicar middleware de autorización para crear producto (solo para administradores)
route.put("/updateProd/:id", authenticateToken, isAdminOrPremium, updateProduct); // Aplicar middleware de autorización para actualizar producto (solo para administradores)
route.delete("/deleteProd/:id", authenticateToken, isAdminOrPremium, deleteProduct); // Aplicar middleware de autorización para eliminar producto (solo para administradores)
// Ruta para obtener productos simulados
route.get('/mockingproducts', generateSimulatedProducts);

module.exports = route;
