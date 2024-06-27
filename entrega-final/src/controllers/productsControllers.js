const errorDictionary = require("../middleware/errorDictionary");
const ProductManager = require("../services/productService");
const productManager = new ProductManager();
const faker = require('faker');
const { getLogger } = require('../config/logger.config');
const logger = getLogger(process.env.NODE_ENV);
const ObjectId = require('mongoose').Types.ObjectId;
const transporter = require('../config/email.config');
const UserManager = require('../services/userService');
const userManager = new UserManager();

async function renderProductsPage(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 9;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const sort = req.query.sort;
    const query = req.query || {};

    const productos = await productManager.getProducts(limit, page, sort, query);

    if (productos.success) {
      const mappedProducts = productos.payload.map(item => ({
        _id: item._id,
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.category,
        stock: item.stock,
        disponibilidad: item.status,
        thumbnail: item.thumbnail,
        owner: item.owner
      }));

      const isAdmin = req.session.user ? req.session.user.role === 'admin' : false;
      const isPremium = req.session.user ? req.session.user.role === 'premium' : false;

      res.render("products", {
        products: mappedProducts,
        user: req.session.user || { email: null, role: null },
        cartId: req.session.user ? req.session.user.cart : null,
        valor: true,
        isAdmin: isAdmin,
        isPremium: isPremium,
        page: page,
        totalPages: productos.totalPages,
        prevPage: productos.prevPage,
        nextPage: productos.nextPage,
      });
    } else {
      res.status(500).json({
        message: productos.message,
        error: productos.error
      });
    }
  } catch (error) {
    logger.error(`Error obteniendo los productos: ${error}`);
    res.status(500).json({ error: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}

async function renderManagerPage(req, res) {
  
  try {


    res.render("productsManager", {
      user: req.session.user || { email: null, role: null },
      cartId: req.session.user ? req.session.user.cart : null,
      valor: true,
    });
  } catch (error) {
    logger.error(`Error al renderizar la página del administrador: ${error}`);
    res.status(500).json({ error: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}

async function getAllProductsAPI(req, res) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const sort = req.query.sort;
    const query = req.query || {};

    const productos = await productManager.getProducts(limit, page, sort, query);

    if (productos.success) {
      const mappedProducts = productos.payload.map(item => ({
        _id: item._id,
        title: item.title,
        description: item.description,
        price: item.price,
        category: item.category,
        stock: item.stock,
        code: item.code,
        status: item.status,
        thumbnail: item.thumbnail,
        owner: item.owner
      }));

      const isAdmin = req.session.user ? req.session.user.role === 'admin' : false;
      const isPremium = req.session.user ? req.session.user.role === 'premium' : false;

      res.json({
        message: "Productos encontrados",
        data: mappedProducts,
        isAdmin: isAdmin,
        isPremium: isPremium,
      });
    } else {
      res.status(500).json({ message: productos.message, error: productos.error });
    }
  } catch (error) {
    logger.error(`Error obteniendo los productos: ${error}`);
    res.status(500).json({ error: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}


async function getProductById(req, res) {
  const productId = req.params.productId;

  try {
    const productResult = await productManager.getProductById(productId);

    if (productResult.success) {
      res.status(200).send({
        msg: errorDictionary.PRODUCT_FOUND,
        data: productResult.data,
      });
    } else {
      res.status(404).send({
        msg: errorDictionary.PRODUCT_NOT_FOUND,
        data: null,
      });
    }
  } catch (error) {
    logger.error(`Error al obtener el producto por ID: ${error}`);
    res.status(500).send({ error: errorDictionary.ERROR_SEARCHED_PRODUCT });
  }
}

async function createProduct(req, res, isTest = false) {
  try {
    const {
      title,
      description,
      price,
      thumbnail,
      code,
      stock,
      status,
      category,
      owner
    } = req.body;

    const ownerId = owner ? new ObjectId(owner) : "admin";

    if (req.session.user && (req.session.user.role === 'premium' || req.session.user.role === 'admin')) {
      const newProduct = await productManager.addProduct({
        title,
        description,
        price,
        thumbnail,
        code,
        stock,
        status,
        category,
        owner: ownerId
      });

      const userAgent = req.get('User-Agent') || '';
      const isThunder = userAgent.includes('Thunder');

      if (isThunder || isTest) {
        res.status(201).json({
          msg: 'Producto creado correctamente',
          data: newProduct
        });
      } else {
        res.redirect("/api/products/manager");
      }
    } else {
      res.status(403).json({ error: 'Acceso denegado. Solo los usuarios premium o admin pueden crear productos.' });
    }
  } catch (error) {
    logger.error(`Error al crear un producto: ${error}`);
    res.status(500).json({ error: errorDictionary.ERROR_ADDING_PRODUCT });
  }
}

async function updateProduct(req, res) {
  const productId = req.params.id;
  const newData = req.body;
  const user = req.session.user;
  const userId = new ObjectId(user._id);

  try {
    if (!productId) {
      return res.status(400).send({ error: 'ID del producto no válido' });
    }

    const productResult = await productManager.getProductById(productId);
    const product = productResult.data;

    if (!product) {
      return res.status(404).send({ error: 'Producto no encontrado' });
    }

    if (user && (user.role === 'admin' || (user.role === 'premium' && product.owner !== 'admin' && product.owner.equals(userId)))) {
      const updateResult = await productManager.updateProduct(productId, newData);

      if (updateResult.success) {
        res.status(200).send({
          msg: 'Producto actualizado correctamente',
          data: updateResult.data,
        });
      } else {
        res.status(404).send({ error: updateResult.message });
      }
    } else {
      res.status(403).send({ error: 'El usuario no tiene permisos para modificar este producto' });
    }
  } catch (error) {
    logger.error(`Error al actualizar el producto: ${error}`);
    res.status(500).send({ error: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}

async function deleteProduct(req, res) {
  const productId = req.params.id;
  const user = req.session.user;
  const userId = new ObjectId(user._id);

  try {
    const productResult = await productManager.getProductById(productId); // Usando el método de tu ProductManager para obtener el producto
    const product = productResult.data;

    if (!product) {
      return res.status(404).send({ error: errorDictionary.PRODUCT_NOT_FOUND });
    }

    if (user && (user.role === 'admin' || (user.role === 'premium' && product.owner.equals(userId)))) {
      const deleteResult = await productManager.deleteProductById(productId); // Usando el método de tu ProductManager para eliminar el producto

      if (deleteResult) {
        // Send email to premium user who created the product if deleted by premium or admin
        if (product.owner.equals(userId) || user.role == 'admin') { // Solo notificar si el propietario del producto no es el usuario que lo está eliminando y no es admin
          const owner = await userManager.getUserById(product.owner); // Suponiendo que userManager es donde obtienes los detalles del usuario propietario
          if (owner.role === 'premium') {
            const mailOptions = {
              from: process.env.EMAIL_USER,
              to: owner.email,
              subject: 'Producto eliminado',
              text: `Hola ${owner.name}, tu producto con ID ${productId} ha sido eliminado por ${user.name}.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                logger.error('Error al enviar el correo:', error);
              } else {
                logger.info('Correo enviado:', info.envelope.to);
              }
            });
          }
        }

        res.status(200).send({ msg: errorDictionary.PRODUCT_DELETED });
      } else {
        res.status(404).send({ error: errorDictionary.PRODUCT_NOT_FOUND });
      }
    } else {
      res.status(403).send({ error: 'El usuario no tiene permisos para eliminar este producto' });
    }
  } catch (error) {
    logger.error(`Error al eliminar el producto: ${error}`);
    res.status(500).send({ error: errorDictionary.INTERNAL_SERVER_ERROR });
  }
}



const generateSimulatedProducts = (req, res) => {
  try {
    const simulatedProducts = Array.from({ length: 100 }, (_, index) => ({
      _id: index + 1,
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: faker.datatype.number({ min: 1, max: 100 }),
      thumbnail: faker.image.imageUrl(200, 300),
      code: faker.lorem.word() + `_${index + 1}`,
      stock: faker.datatype.number({ min: 1, max: 100 }),
      status: faker.datatype.boolean(),
      category: faker.commerce.department(),
    }));

    res.json(simulatedProducts);
  } catch (error) {
    logger.error(`Error al generar productos simulados: ${error}`);
    res.status(500).send({ error: errorDictionary.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  renderProductsPage,
  getAllProductsAPI,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  renderManagerPage,
  generateSimulatedProducts
};
