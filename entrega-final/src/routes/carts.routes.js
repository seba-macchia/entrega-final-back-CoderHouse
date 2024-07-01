const { Router } = require("express");
const route = new Router();
const { authenticateToken, isAdmin, isUser, isPremiumOrUser} = require("../middleware/authMiddleware.js");
const {
  getAllCarts,
  createCart,
  deleteCart,
  addProductToCart,
  updateCart,
  deleteAllProductsFromCart,
  purchaseCart,
  updateProductQuantity,
  showCart,
} = require("../controllers/cartsControllers.js");
const CartManager = require("../services/cartService.js");
const cartManager = new CartManager();

route.get("/allCarts", authenticateToken, getAllCarts); // Solo el administrador puede ver todos los carritos
route.get("/:cid", authenticateToken, isPremiumOrUser, showCart); // Solo el usuario puede ver un carrito
route.post("/addProdToCart/:cId/:pId", authenticateToken, isPremiumOrUser, addProductToCart); // Solo el usuario puede agregar productos al carrito
route.post("/createCart", authenticateToken, createCart);
route.delete("/:cid/products/:pid", authenticateToken, isPremiumOrUser, cartManager.delProdById); // Solo el administrador puede eliminar productos del carrito
route.delete("/:cid", authenticateToken, isAdmin, deleteCart); // Solo el administrador puede eliminar carritos
route.post("/:cid/products", authenticateToken, isPremiumOrUser, deleteAllProductsFromCart); 
route.put("/:cid", authenticateToken, isAdmin, cartManager.updateCart); // Solo el administrador puede actualizar carritos
route.put("/:cid/products/:pid", authenticateToken, isPremiumOrUser, updateProductQuantity); // Solo el usuario puede actualizar productos del carrito
route.post("/:cid/purchase", authenticateToken, isPremiumOrUser, purchaseCart); 

module.exports = route;
