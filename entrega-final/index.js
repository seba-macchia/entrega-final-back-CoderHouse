const express = require("express");
const passport = require('passport');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const handlebars = require("express-handlebars");
const http = require("http");
const { Server } = require("socket.io");
const app = express();
const Database = require("./src/config/database.js");
const Chat = require("./src/models/chat.model.js");
const errorDictionary = require('./src/middleware/errorDictionary');
const loggerConfig = require('./src/config/logger.config.js');
const loggerRoutes = require('./src/routes/logger.routes.js');
const authRoutes = require("./src/routes/auth.routes.js");
const viewsRoutes = require("./src/routes/main.routes.js");
const messagesRoute = require("./src/routes/chat.routes.js");
const chatRoutes = require("./src/routes/chat.routes.js");
const userRoutes = require('./src/routes/user.routes.js');
const loggerMiddleware = require('./src/middleware/loggerMiddleware.js');
const config = require('./src/config/loger.commander.js');
const swaggerUIExpress = require('swagger-ui-express');
const swaggerConfig = require('./src/config/swaggerConfig.js'); 
require('dotenv').config();

// Middleware para el análisis del cuerpo de la solicitud JSON y URL codificado
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Configuración de la base de datos
Database.connect()
  .then(() => {
    loggerConfig.getLogger(process.env.NODE_ENV, process.env.LOG_LEVEL).info(errorDictionary.CONECTION_DATABASE); 
  })
  .catch((error) => {
    loggerConfig.getLogger(process.env.NODE_ENV, process.env.LOG_LEVEL).error(`${errorDictionary.DATABASE_ERROR} ${error}`); 
  });

// Configuración de la sesión
app.use(session({
  secret: 'mySecret', 
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
  }),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 15 * 60 * 1000 } // 15 minutos en milisegundos
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session()); // Asegúrate de que la sesión de Passport está inicializada

// Middleware para el análisis de cookies
app.use(cookieParser());

// Middleware de registro de solicitudes
app.use(loggerMiddleware);

// Configurar el motor de vistas Handlebars con el helper eq
const hbs = handlebars.create({
  extname: "handlebars", // Cambié extnames a extname para corregir un posible error de typo
  helpers: {
    // Helper para serializar objetos a JSON seguro
    jsonSafeStringify: function (context) {
      return JSON.stringify(context);
    },
    eq: function (a, b) {
      return a === b;
    },
    toggleRoleText: function(role) {
      return role === 'premium' ? 'User' : 'Premium';
    }
  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  }
});

// Configurar el motor de vistas y el middleware de Handlebars
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", __dirname + "/src/views");

// Rutas
app.use('/logs', loggerRoutes);
app.use('/api/sessions', authRoutes);
app.use("/msg", messagesRoute);
app.use('/', viewsRoutes);
app.use('/api/users', userRoutes);
app.use(express.static(__dirname + "/public"));
app.use("/chat", chatRoutes);

// Configuración de Swagger
app.use("/apidocs", swaggerUIExpress.serve, swaggerUIExpress.setup(swaggerConfig));

// Inicialización del servidor HTTP
const PORT = config.port;
const server = http.createServer(app);

// Configuración de Socket.io
const io = new Server(server);
io.on('connection', (socket) => {
  const logger = loggerConfig.getLogger(process.env.NODE_ENV, process.env.LOG_LEVEL);
  logger.info(`Nuevo cliente conectado ${socket.id}`);

  socket.on("all-messages", async () => {
    const messages = await Chat.find();
    socket.emit("message-all", messages);
  });

  socket.on("new-message", async (data) => {
    const newMessage = new Chat(data);
    await newMessage.save();
    const messages = await Chat.find();
    socket.emit("message-all", messages);
  });
});

// Iniciar el servidor
server.listen(PORT, () => {
  loggerConfig.getLogger(process.env.NODE_ENV, process.env.LOG_LEVEL).info(`${errorDictionary.LISTENING_PORT} ${PORT}`); 
});

module.exports = server;