const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../utils/generateToken");

function authenticateToken(req, res, next) {
  const token = req.cookies.cookieToken; // Asumiendo que el token se guarda en una cookie

  if (!token) {
    return res.redirect('/?message=Sesión expirada. Debe volver a iniciar sesión.');
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.redirect('/?message=Sesión expirada. Debe volver a iniciar sesión.');
    }

    req.user = user;
    next();
  });
}


const isAdmin = (req, res, next) => {
  // Verificar si el usuario es un administrador
  if (req.session.user && req.session.user.role === 'admin') {
    // Configurar req.user con la información del usuario almacenada en req.session.user
    req.user = req.session.user;
    // Permitir acceso si es un administrador
    next();
  } else {
    // Denegar acceso si no es un administrador
    res.status(403).json({ error: 'Acceso denegado. Solo los administradores pueden realizar esta acción.' });
  }
};

const isUser = (req, res, next) => {
  // Verificar si el usuario es un usuario normal
  if (req.session.user && req.session.user.role === 'user') {
    // Configurar req.user con la información del usuario almacenada en req.session.user
    req.user = req.session.user;
    // Permitir acceso si es un usuario normal
    next();
  } else {
    // Denegar acceso si no es un usuario normal
    res.status(403).json({ error: 'Acceso denegado. Solo los usuarios pueden realizar esta acción.' });
  }
};

const isPremium = (req, res, next) => {
  // Verificar si el usuario es un usuario premium
  if (req.session.user && req.session.user.role === 'premium') {
    // Configurar req.user con la información del usuario almacenada en req.session.user
    req.user = req.session.user;
    // Permitir acceso si es un usuario premium
    next();
  } else {
    // Denegar acceso si no es un usuario premium
    res.status(403).json({ error: 'Acceso denegado. Solo los usuarios premium pueden realizar esta acción.' });
  }
}

const isAdminOrPremium = (req, res, next) => {
  // Verificar si el usuario es un administrador o un usuario premium
  if (
    (req.session.user && req.session.user.role === 'admin') ||
    (req.session.user && req.session.user.role === 'premium')
  ) {
    // Configurar req.user con la información del usuario almacenada en req.session.user
    req.user = req.session.user;
    // Permitir acceso si es un administrador o un usuario premium
    next();
  } else {
    // Denegar acceso si no es un administrador o un usuario premium
    res.status(403).json({ error: 'Acceso denegado. Solo los administradores o usuarios premium pueden realizar esta acción.' });
  }
};

const isPremiumOrUser = (req, res, next) => {
  // Verificar si el usuario es un usuario premium o un usuario normal
  if (
    (req.session.user && req.session.user.role === 'premium') ||
    (req.session.user && req.session.user.role === 'user')

  ) {
    // Configurar req.user con la información del usuario almacenada en req.session.user
    req.user = req.session.user;
    // Permitir acceso si es un usuario premium o un usuario normal
    next();
  } else {
    // Denegar acceso si no es un usuario premium o un usuario normal
    res.status(403).json({ error: 'Acceso denegado. Solo los usuarios premium o usuarios normales pueden realizar esta acción.' });
  }
};


module.exports = { authenticateToken, isAdmin, isUser, isPremium, isAdminOrPremium, isPremiumOrUser };

