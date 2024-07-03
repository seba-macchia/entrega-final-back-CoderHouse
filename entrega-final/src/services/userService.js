const User = require("../models/user.model");
const { createHash } = require("../utils/bcrypts");
const CartManager = require("./cartService");
const cartManager = new CartManager();
const UserDao = require("../dao/mongo/userDao");
const errorDictionary = require("../middleware/errorDictionary");

class UserManager {
  constructor() {
    this.userDao = new UserDao();
  }

  async addUser(userData) {
    try {
      const exist = await this.findUserByEmail(userData.email);
      let cartId;
  
      if (!exist || !exist.cart) {
        // Si el usuario no existe o no tiene un carrito asociado, crea uno nuevo
        const cartResponse = await cartManager.createCart();
        cartId = cartResponse._id;
      } else {
        // Si el usuario ya existe y tiene un carrito asociado, usa su ID de carrito existente
        cartId = exist.cart._id;
      }
  
      // Asigna el ID del carrito al userData
      userData.cart = cartId;
  
      // Si el usuario es admin, establece su rol
      if (userData.email === "admin@coder.com") {
        userData.role = "admin";
      }
  
      // Agrega el usuario con los datos actualizados, incluido el ID del carrito
      const newUser = await this.userDao.addUser(userData);
  
      return newUser;
    } catch (error) {
      console.error(errorDictionary.ERROR_USER_NOT_CREATED, error);
    }
  }
  async getUserById(id) {
    try {
      return await this.userDao.getUserById(id);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async deleteUser(id) {
    try {
      return await this.userDao.deleteUser(id);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async loginWithGitHub(profile) {
    try {
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : '';
      let user = await this.findUserByEmail(email);
  
      if (!user) {
        const cartData = await cartManager.createCart();
        const cartId = cartData._id;
  
        user = new User({
          email: email,
          password: createHash("githubuserpassword"),
          name: profile.displayName || '',
          lastname: profile.name && profile.name.familyName ? profile.name.familyName : '',
          age: profile.age || '',
          cart: cartId,
          githubId: profile.id,
          role: "user", // Asignar el rol como "user" para los usuarios de GitHub
        });
  
        await user.save();
      }
  
      delete user.password;
      return user;
    } catch (err) {
      console.error(err);
      return false;
    }
  }
  


  async logout(userId) {
    try {
      await this.userDao.getUserById(userId, { last_connection: new Date() });
      return true; // Logout exitoso
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }


  async findUserByEmail(email) {
    try {
      return await this.userDao.findUserByEmail(email);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async findUserById(id) {
    try {
      return await this.userDao.findUserByGithubId(id);
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async getAllUsers() {
    try {
        const users = await User.find({}, { name: 1, email: 1, role: 1 }).lean();
        return users;
    } catch (error) {
        console.error(error);
        throw error;
    }
  }

  async updateUserRole(userId, role) {
      try {
          await User.findByIdAndUpdate(userId, { role });
      } catch (error) {
          console.error(error);
          throw error;
      }
  }

  async deleteUser(userId) {
      try {
          await User.findByIdAndDelete(userId);
      } catch (error) {
          console.error(error);
          throw error;
      }
  }
  async getInactiveUsers(lastActiveDate) {
    try {
        const users = await User.find({ last_connection: { $lt: lastActiveDate } });
        let inactiveUsers = [];
        users.forEach(user => {
          if (user.role != "admin") {
            inactiveUsers.push(user);
          }
        });
        return inactiveUsers;
    } catch (error) {
        console.error('Error al obtener usuarios inactivos:', error);
        throw error;
    }
  }


  async deleteUserById(userId) {
    try {
      await this.userDao.deleteUser(userId);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateUserById(userId, updatedFields) {
    try {
        const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });
        return updatedUser;
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        throw new Error('No se pudo actualizar el usuario');
    }
}
}

module.exports = UserManager