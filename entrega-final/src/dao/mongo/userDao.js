
const User = require('../../models/user.model');
const mongoose = require('mongoose');

class UserDao {
  async addUser(userData) {
    try {
      const newUser = new User(userData);
      await newUser.save();
      return newUser;
    } catch (error) {
      console.error('Error al crear usuario:', error);
      throw error;
    }
  }

  async getUserById(id) {
    try {
      if (!id) {
        return null;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return null;
      }

      const user = await User.findById(id);
      return user;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async deleteUser(id) {
    try {
      const res = await User.deleteOne({ _id: id });
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async findUserByEmail(email) {
    try {
      const userFound = await User.findOne({ email: email });
      return userFound ? userFound : null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async findUserByGithubId(id) {
    try {
      const userFound = await User.findOne({ githubId: id });
      return userFound ? userFound : null;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async getAllUsers() {
    try {
        const users = await User.find({}, { name: 1, email: 1, role: 1});
        return users.map(user => user.toObject());
    } catch (error) {
        console.error(error);
        throw error;
    }
}
async getInactiveUsers(lastActiveDate) {
  try {
    const inactiveUsers = await User.find({ lastConnection: { $lt: lastActiveDate } });
    return inactiveUsers;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async updateUserById(id, userData) {
  try {
      const updatedUser = await User.findOneAndUpdate({ _id: id }, userData, { new: true });
      return updatedUser;
  } catch (error) {
      console.error('Error al actualizar el usuario en el DAO:', error);
      throw error;
  }
}


}

module.exports = UserDao;