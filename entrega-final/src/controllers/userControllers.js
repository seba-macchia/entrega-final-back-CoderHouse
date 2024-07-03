const transporter = require('../config/email.config');
const User = require('../models/user.model');
const UserManager = require('../services/userService');
const userManager = new UserManager();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');
// Enviar correo de restablecimiento de contraseña
async function sendResetPasswordEmail(req, res) {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            // Si el usuario no es encontrado, enviar una respuesta JSON con un mensaje adecuado
            return res.status(400).json({ userNotFound: true });
        }

        // Generar un token único
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora de expiración
        await user.save();

        // Compile the Handlebars template
        const templateSource = fs.readFileSync('./src/views/resetPasswordEmail.handlebars', 'utf8');
        const compiledTemplate = Handlebars.compile(templateSource);
        const resetUrl = `https://entrega-final-back-coderhouse-production.up.railway.app/api/users/reset-password/${resetToken}`;

        // Render the template with data
        const html = compiledTemplate({ username: user.username, resetUrl });

        // Enviar el correo electrónico de restablecimiento de contraseña
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Restablecimiento de contraseña',
            html: html,
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return res.status(500).json({ message: 'Error al enviar el correo electrónico de restablecimiento de contraseña' });
            } else {
                return res.status(200).json({ message: 'Correo electrónico de restablecimiento de contraseña enviado' });
            }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}


// Renderizar la vista para ingresar nueva contraseña
async function renderNewPasswordForm(req, res) {
    const { token } = req.params;
    res.render('newPassword', { token });
}

// Restablecer la contraseña
async function resetPassword(req, res) {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Buscar el usuario con el token proporcionado
        const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

        if (!user) {
            // Si no se encuentra un usuario con el token válido, enviar una respuesta JSON
            return res.status(400).json({ expiredToken: true });
        }

        // Verificar si la nueva contraseña es igual a la anterior
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: 'No puedes utilizar la misma contraseña anterior' });
        }

        // Generar un nuevo token único
        const newResetToken = crypto.randomBytes(20).toString('hex');

        // Actualizar la contraseña, el token y la expiración
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = newResetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora de expiración
        await user.save();

        res.status(200).json({ message: 'Contraseña restablecida con éxito' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}

async function renderResetPassword(req, res) {
    res.render('resetPassword');
}

// Función para normalizar nombres de archivos
const normalizeFileName = (fileName) => {
  const noNumberFileName = fileName.replace(/^\d+-/, "");
  const noExtensionFileName = noNumberFileName.replace(/\.[^/.]+$/, "");
  return noExtensionFileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\.]/g, "_")
    .toLowerCase();
};

// Función para subir documentos
async function uploadDocuments(req, res) {
  try {
    const { uid } = req.params;
    const user = await User.findById(uid);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No se han subido archivos' });
    }
    
    ['profileImage', 'productImage', 'documents'].forEach(field => {
      if (req.files[field]) {
        req.files[field].forEach(file => {
          const normalizedFileName = normalizeFileName(file.originalname);
          const documentExists = user.documents.some(doc => normalizeFileName(doc.name) === normalizedFileName);
          if (!documentExists) {
            const uploadPath = path.join(__dirname, '../../uploads', field, normalizedFileName);
            fs.renameSync(file.path, uploadPath);

            user.documents.push({
              name: normalizedFileName,
              reference: path.relative(path.join(__dirname, '../../uploads'), uploadPath)
            });
            req.session.user.documents = user.documents;
          }
        });
      }
    });

    await user.save();
    req.session.user = user;
    res.status(200).json({ message: 'Documentos subidos correctamente', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Función para cambiar el rol de un usuario entre "user" y "premium"
async function toggleUserRole(req, res) {
  try {
    const { uid } = req.params;
    const user = await User.findById(uid);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar el rol actual del usuario
    if (user.role === 'user') {
      // Verificar si el usuario ha subido todos los documentos requeridos
      const requiredDocuments = ['identificacion', 'comprobante_de_domicilio', 'comprobante_de_estado_de_cuenta'];
      const uploadedDocuments = user.documents.map(doc => normalizeFileName(doc.name));

      // Compara los nombres de los documentos subidos (normalizados) con los nombres requeridos (normalizados)
      const hasAllDocuments = requiredDocuments.every(doc => uploadedDocuments.includes(doc));

      if (!hasAllDocuments) {
        return res.status(400).json({ error: 'El usuario no ha terminado de procesar su documentación' });
      }

      // Cambiar el rol del usuario a "premium"
      user.role = 'premium';
      req.session.user = user;
    } else if (user.role === 'premium') {
      // Cambiar el rol del usuario a "user" sin restricciones
      user.role = 'user';
      req.session.user = user;
    }

    await user.save();

    res.status(200).json({ message: 'Rol de usuario actualizado correctamente', user });
  } catch (error) {
    console.error('Error al cambiar el rol de usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Función para renderizar la página de usuarios
async function renderUsersPage(req, res) {
  try {
      const users = await userManager.getAllUsers();
      res.render('users', { users, isAdmin: req.user.role === 'admin' });
  } catch (err) {
      res.status(500).send('Error al obtener usuarios');
  }
}
// Controlador para actualizar un usuario
async function updateUser(req, res) {
  const userId = req.params.uid;

  try {
      // Verifica si el usuario existe antes de intentar actualizarlo
      const existingUser = await userManager.getUserById(userId);

      if (!existingUser) {
          return res.status(404).json({ error: 'No se encontró el usuario' });
      }

      // Extrae los datos actualizables del cuerpo de la solicitud
      const { name, lastname, age } = req.body;
      const userData = { name, lastname, age };

      // Intenta actualizar el usuario en la base de datos
      const updatedUser = await userManager.updateUserById(userId, userData);

      if (!updatedUser) {
          return res.status(404).json({ error: 'No se pudo actualizar el usuario' });
      }

      req.session.user = updatedUser;
      // Si la actualización fue exitosa, envía la respuesta con el usuario actualizado
      res.json({ message: 'Usuario actualizado correctamente', user: updatedUser });

  } catch (err) {
      console.error('Error al actualizar el usuario:', err);
      res.status(500).json({ error: 'Error interno al actualizar el usuario' });
  }
}



// Función para actualizar el rol de un usuario
async function updateUserRole(req, res) {
  try {
      const { role } = req.body;
      await userManager.updateUserRole(req.params.id, role);
      res.redirect('/api/users');
  } catch (err) {
      res.status(500).send('Error al actualizar el rol del usuario');
  }
}

// Función para eliminar un usuario
async function deleteUser(req, res) {
  try {
      await userManager.deleteUser(req.params.id);
      res.json({ success: true });
  } catch (err) {
      res.status(500).json({ success: false, message: 'Error al eliminar el usuario' });
  }
}

// Función para enviar correo de eliminación
async function sendDeletionEmail(email) {
  const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Cuenta eliminada por inactividad',
      text: 'Tu cuenta ha sido eliminada debido a inactividad. Si tienes alguna pregunta, contáctanos.'
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log(`Correo enviado a ${email} sobre la eliminación por inactividad.`);
  } catch (error) {
      console.error('Error al enviar correo de eliminación:', error);
      throw error; // Lanzar el error para manejarlo en el controlador
  }
}

// Eliminar usuarios inactivos y enviar correos de notificación
async function deleteInactiveUsers(req, res) {
  try {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // Fecha hace 2 días
      const inactiveUsers = await userManager.getInactiveUsers(twoDaysAgo); // Obtener usuarios inactivos

      // Enviar correos y eliminar usuarios
      for (const user of inactiveUsers) {
          await sendDeletionEmail(user.email); // Utiliza la función importada para enviar el correo de eliminación
          await userManager.deleteUserById(user._id); // Eliminar usuario inactivo
      }

      res.status(200).json({ success: true, message: 'Usuarios inactivos eliminados y notificados' });
  } catch (error) {
      console.error('Error al eliminar usuarios inactivos:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar usuarios inactivos', error });
  }
}



module.exports = {
    sendResetPasswordEmail,
    resetPassword,
    renderResetPassword,
    renderNewPasswordForm,
    toggleUserRole,
    renderUsersPage,
    deleteUser,
    updateUserRole,
    uploadDocuments,
    deleteInactiveUsers,
    updateUser
};
