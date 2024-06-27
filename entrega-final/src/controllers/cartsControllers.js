const errorDictionary = require("../middleware/errorDictionary");
const CartManager = require("../services/cartService");
const cartManager = new CartManager();
const Product = require("../models/productManager.model"); 
const TicketService = require("../services/ticketService");
const ticketService = new TicketService();
const { getLogger } = require('../config/logger.config');
const logger = getLogger(process.env.NODE_ENV);
const transporter = require("../config/email.config")
const handlebars = require("handlebars");
const fs = require('fs');


async function getAllCarts(req, res) {
  try {
    let response = await cartManager.getCarts();
    if (response != false) {
      logger.info('Carritos recuperados exitosamente.');
      return res.status(200).send({ carts: response });
    } else {
      logger.warning('No se encontraron carritos.');
      res.status(404).send({ msg: errorDictionary.CART_NOT_FOUND });
    }
  } catch (err) {
    logger.error('Error al obtener carritos:', err);
    res.status(500).send({ msg: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}

async function addProductToCart(req, res) {
  try {
    let cId = req.params.cId;
    let pId = req.params.pId;
    let quantity = req.body.quantity; // Obtén la cantidad del cuerpo de la solicitud

    let product = await Product.findById(pId);

    if (!product) {
      logger.error(`Producto ${pId} no encontrado.`);
      return res.status(404).send({ msg: `Producto ${pId} no encontrado` });
    }

    if (product.stock < quantity) {
      logger.warning(`Stock insuficiente para el producto ${pId}`);
      return res.status(400).send({ msg: `Stock insuficiente para el producto ${pId}` });
    }

    await cartManager.addProdToCart(cId, pId, quantity); // Pasa la cantidad al método
    logger.info(`Producto ${pId} agregado al carrito ${cId}`);
    res.status(201).send({ msg: `Producto ${pId} agregado al carrito ${cId}` });
  } catch (error) {
    logger.error('Error al agregar producto al carrito:', error);
    res.status(500).send({ msg: errorDictionary.SERVER_PRODUCT_ERROR });
  }
}


async function updateProductQuantity(req, res) {
  try {
    const cid = req.params.cid;
    const pid = req.params.pid;
    const quantity = req.body.quantity;
    const userRole = req.user.role;

    const product = await Product.findById(pid);
    
    if (userRole === 'premium' && product.owner != 'admin') {
      logger.error('No tiene permisos para agregar este producto');
      return res.status(403).send({ msg: 'No tiene permisos para agregar este producto' });
    }

    let response = await cartManager.updateProductQuantity(cid, pid, quantity);

    if (response) {
      logger.info(`Se actualizó la cantidad del producto ${pid} en el carrito ${cid}`);
      res.status(200).send({ msg: `Se actualizó la cantidad del producto ${pid} en el carrito ${cid}`, data: response.data });
    } else {
      logger.warning(`No se pudo actualizar la cantidad del producto ${pid} en el carrito ${cid}`);
      res.status(404).send({ msg: `No se pudo actualizar la cantidad del producto ${pid} en el carrito ${cid}` });
    }
  } catch (error) {
    logger.error('Error al actualizar cantidad del producto en el carrito:', error);
    res.status(500).send({ msg: errorDictionary.SERVER_PRODUCT_ERROR });
  }
}

async function showCart(req, res) {
  try {
    const cid = req.params.cid;

    let response = await cartManager.getCartById(cid);

    if (response.success) {
      // Verificar si la solicitud proviene de Thunder o Swagger
      const userAgent = req.get('User-Agent');
      const isThunder = userAgent.includes('Thunder');
      const isSwagger = userAgent.includes('Swagger');

      if (isThunder || isSwagger) {
        // Si es Thunder o Swagger, devolver el carrito en formato JSON
        res.status(200).json(response.products);
      } else {
        // Si es desde un navegador web, renderizar la vista de carrito
        res.render("cart", {
          products: response.products,
          user: req.session.user ? req.session.user : { email: null, role: null },
          cartId: req.session.user.cart,
          valor: true,
        });
      }
    } else {
      logger.warning('No se encontró el carrito solicitado.');
      res.status(404).send({ msg: response.message });
    }
  } catch (err) {
    logger.error('Error al mostrar carrito:', err);
    res.status(500).send({ msg: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}



async function deleteAllProductsFromCart(req, res) {
  try {
    const cid = req.params.cid;

    let response = await cartManager.deleteAllProdFromCart(cid);

    if (response) {
      logger.info(`Todos los productos del carrito ${cid} eliminados correctamente.`);
      res.redirect("/api/carts/" + cid);
    } else {
      logger.warning(`No se pudo eliminar todos los productos del carrito ${cid}`);
      res.status(404).send({ msg: `No se pudo eliminar todos los productos del carrito ${cid}` });
    }
  } catch (err) {
    logger.error('Error al eliminar todos los productos del carrito:', err);
    res.status(500).send({ msg: errorDictionary.SERVER_CART_ERROR });
  }
}

async function createCart(req, res) {
  try {
    let response = await cartManager.createCart();
    if (response) {
      logger.info('Carrito creado exitosamente.');
      res.status(201).send({ msg: errorDictionary.CART_FOUND, cart: response });
    } else {
      logger.warning('Error al crear carrito.');
      res.status(400).send({ msg: errorDictionary.ERROR_CREATING_CART });
    }
  } catch (err) {
    logger.error('Error al crear carrito:', err);
    res.status(500).send({ msg: errorDictionary.SERVER_CREATED_CART_ERROR });
  }
}

async function sendPurchaseEmail(email, ticket,purchasedProducts, unpurchasedProducts, cartId, error) {
  const source = fs.readFileSync('src/views/purchaseEmailTemplate.handlebars', 'utf8'); // Update the path as necessary
  const template = handlebars.compile(source);
  
  const data = {
    ticket,
    purchasedProducts,
    unpurchasedProducts,
    cartId,
    error
  };

  const html = template(data);

  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Detalles de tu compra',
      html: html
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log(`Correo enviado a ${email} con los detalles de la compra.`);
  } catch (error) {
      console.error('Error al enviar correo de compra:', error);
      throw error; // Lanzar el error para manejarlo en el controlador
  }
}

async function purchaseCart(req, res) {
  const logger = req.logger || fallbackLogger;

  try {
    const { cid } = req.params;
    const userId = req.user._id;
    const email = req.user.email;

    const cart = await cartManager.getCartById(cid);
    if (!cart.success) {
      logger.warning('El carrito no existe.');
      return res.status(404).json({ error: errorDictionary.CART_NOT_FOUND });
    }

    const ticketData = await ticketService.generateTicket(cart, userId);

    if (ticketData.ticket) {
      try {
        await sendPurchaseEmail(email, ticketData.ticket.toObject(), ticketData.purchasedProducts, ticketData.unpurchasedProducts, cid);
      } catch (error) {
        logger.error('Error al enviar correo de compra:', error);
      }

      if (ticketData.purchasedProducts.length === cart.products.length) {
        logger.info('Compra completada.');

        const userAgent = req.get('User-Agent');
        const isSwagger = userAgent.includes('Swagger');

        if (isSwagger) {
          return res.json({ ticket: ticketData.ticket.toObject(), cartId: cid });
        } else {
          return res.render('checkout', { ticket: ticketData.ticket.toObject(), purchasedProducts: ticketData.purchasedProducts, cartId: cid });
        }
      } else {
        logger.info('Compra parcial.');

        return res.render('checkout', { ticket: ticketData.ticket.toObject(), purchasedProducts: ticketData.purchasedProducts, unpurchasedProducts: ticketData.unpurchasedProducts, cartId: cid });
      }
    } else {
      logger.error('No se pudo generar el ticket.');

      return res.render('checkout', { error: errorDictionary.TICKET_NOT_GENERATED, unpurchasedProducts: ticketData.unpurchasedProducts, cartId: cid });
    }
  } catch (error) {
    logger.error('Error al procesar la compra:', error);
    res.status(500).json({ error: 'Ocurrió un error' });
  }
}



async function deleteCart(req, res) {
  try {
    const cid = req.params.cid;

    const response = await cartManager.deleteCart(cid);
    if (response) {
      logger.info(`Carrito con ID ${cid} eliminado correctamente.`);
      res.status(200).send({ msg: `Carrito con ID ${cid} eliminado correctamente` });
    } else {
      logger.warning(`No se encontró ningún carrito con el ID ${cid}`);
      res.status(404).send({ msg: `No se encontró ningún carrito con el ID ${cid}` });
    }
  } catch (err) {
    logger.error('Error al eliminar carrito:', err);
    res.status(500).send({ msg: errorDictionary.SERVER_ELIMINATE_CART});
  }
}


module.exports = {
  getAllCarts,
  addProductToCart,
  createCart,
  updateProductQuantity,
  purchaseCart,
  deleteAllProductsFromCart,
  deleteCart,
  showCart,
};
