const express = require('express');
const route = express.Router();
const userControllers = require('../controllers/userControllers.js');
const upload = require('../middleware/uploadMiddleware.js'); // Importa el middleware de upload
const {authenticateToken, isAdmin} = require('../middleware/authMiddleware.js');

// Ruta para obtener la vista de administración de usuarios
route.get('/', authenticateToken, isAdmin, userControllers.renderUsersPage);

// Ruta para actualizar el rol del usuario
route.post('/updateRole/:id', authenticateToken, isAdmin, userControllers.updateUserRole);

// Ruta para eliminar un usuario
route.delete('/deleteUser/:id', authenticateToken, isAdmin, userControllers.deleteUser);

// Ruta para eliminar usuarios inactivos
route.delete('/', authenticateToken, isAdmin, userControllers.deleteInactiveUsers);

// Ruta para renderizar la vista de restablecer la contraseña
route.get('/reset-password', authenticateToken, userControllers.renderResetPassword);
route.post('/reset-password-email', authenticateToken, userControllers.sendResetPasswordEmail);
route.get('/reset-password/:token', authenticateToken, userControllers.renderNewPasswordForm);
route.post('/reset-password/:token', authenticateToken, userControllers.resetPassword);
route.put('/premium/:uid', authenticateToken, userControllers.toggleUserRole);
route.put('/:uid/update', authenticateToken, userControllers.updateUser);

// Nueva ruta para manejar la subida de documentos
route.post('/:uid/documents', authenticateToken, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'productImage', maxCount: 1 },
  { name: 'documents', maxCount: 3 }
]), userControllers.uploadDocuments);



module.exports = route;


