// Definición de la clase UserDTO
class UserDTO {
  constructor(user) {
      this._id = user._id;
      this.email = user.email;
      this.name = user.name;
      this.lastname = user.lastname;
      this.age = user.age;
      this.cartId = user.cart;
      this.role = user.role;
      this.documents = user.documents;
  }

  // Método para obtener los datos del usuario como un objeto
  getData() {
      return {
          _id: this._id,
          email: this.email,
          name: this.name,
          lastname: this.lastname,
          age: this.age,
          cartId: this.cartId,
          role: this.role,
          documents: this.documents
      };
  }

  // Método para actualizar los datos del usuario
  updateData(newData) {
      this.email = newData.email || this.email;
      this.name = newData.name || this.name;
      this.lastname = newData.lastname || this.lastname;
      this.age = newData.age || this.age;
      this.role = newData.role || this.role;
      this.documents = newData.documents || this.documents;
  }
}

module.exports = UserDTO;