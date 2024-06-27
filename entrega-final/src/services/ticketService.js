const Ticket = require('../models/ticket.model');
const Product = require('../models/productManager.model');
const User = require('../models/user.model');
const CartService = require('./cartService');
const errorDictionary = require('../middleware/errorDictionary');

class TicketService {
  constructor() {
    this.cartService = new CartService();
  }

  async generateTicket(cart, userId) {
    try {
      const products = cart.products;
      const purchasedProducts = [];
      const unpurchasedProducts = [];

      let totalAmount = 0; // Inicializar el monto total en 0

      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`Usuario no encontrado con ID: ${userId}`);
      }

      // Procesar compra para cada producto en el carrito y reducir el stock
      for (const product of products) {
        const productDocument = await Product.findOne({ _id: product._id });

        if (!productDocument) {
          continue; // Si el producto no existe, saltar al siguiente
        }

        if (productDocument.stock >= product.quantity) {
          // Calcular el precio total solo si el producto se ha comprado
          totalAmount += product.price * product.quantity;

          // Reducir el stock del producto y marcar como comprado
          productDocument.stock -= product.quantity;
          await productDocument.save();

          purchasedProducts.push({
            _id: product._id,
            title: product.title,
            thumbnail: product.thumbnail,
            quantity: product.quantity,
            category: product.category,
            price: product.price
          });

          // Eliminar el producto vendido del carrito utilizando el servicio de carrito
          await this.cartService.delProdById(cart._id, product._id);
        } else {
          // Si no hay suficiente stock, marcar como no comprado
          unpurchasedProducts.push({
            _id: product._id,
            title: product.title,
            thumbnail: product.thumbnail,
            quantity: product.quantity,
            category: product.category,
            price: product.price
          });
        }
      }

      // Si se compró al menos un producto, generamos el ticket
      let ticket = null;
      if (purchasedProducts.length > 0) {
        ticket = new Ticket({
          code: this.generateCode(),
          purchase_datetime: new Date(),
          amount: totalAmount,
          purchaser: user.email
        });
        await ticket.save();
      }

      return { ticket, purchasedProducts, unpurchasedProducts };
    } catch (error) {
      throw new Error(`Error al generar el ticket: ${error.message}`);
    }
  }

  generateCode() {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}

module.exports = TicketService;
