const express = require('express');
const route = express.Router();
const userControllers = require('../controllers/userControllers.js');
const upload = require('../middleware/uploadMiddleware.js'); // Importa el middleware de upload
const {isAdmin} = require('../middleware/authMiddleware.js');

// Ruta para obtener la vista de administración de usuarios
route.get('/', isAdmin, userControllers.renderUsersPage);

// Ruta para actualizar el rol del usuario
route.post('/updateRole/:id', isAdmin, userControllers.updateUserRole);

// Ruta para eliminar un usuario
route.delete('/deleteUser/:id', isAdmin, userControllers.deleteUser);

// Ruta para eliminar usuarios inactivos
route.delete('/', isAdmin, userControllers.deleteInactiveUsers);

// Ruta para renderizar la vista de restablecer la contraseña
route.get('/reset-password', userControllers.renderResetPassword);
route.post('/reset-password-email', userControllers.sendResetPasswordEmail);
route.get('/reset-password/:token', userControllers.renderNewPasswordForm);
route.post('/reset-password/:token', userControllers.resetPassword);
route.put('/premium/:uid', userControllers.toggleUserRole);
route.put('/:uid/update', userControllers.updateUser);

// Nueva ruta para manejar la subida de documentos
route.post('/:uid/documents', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 },
  { name: 'documents', maxCount: 3 }
]), userControllers.uploadDocuments);



module.exports = route;


