"use strict";

// Variables locales
const PORT = 3000;

// Modulos externos
const path = require("path");                                   // Para funciones sobre rutas
const express = require("express");                             // Para habilitar el marco express
const bodyParser = require("body-parser");                      // Para tratar el objeto request en peticiones POST
const cookieParser = require("cookie-parser");                  // Para interpretar las cookies en el objeto request
const session = require("express-session");                     // Para gestionar las sesiones
const mysqlSession = require("express-mysql-session");          // Para gestionar la sesion MySQL
const MySQLStore = mysqlSession(session);                       // Se asocia la sesion de express con la de MySQL
//const mysqlDBData = require("./config/database/mysqlDBData");   // Se importa la informacion para acceder a la DB
//const sessionStore = new MySQLStore(mysqlDBData);

// Routers


// Middlewares


// Se inicia el servidor
const app = express();
const staticFiles = path.join(__dirname, 'public');  // Ruta de ficheros estaticos

// Para activar ejs
app.set("view engine", "ejs");                          // Se define el motor de vistas dinamicas ejs
app.set("views", path.join(__dirname, "views"));        // Se define la carpeta de plantillas de vistas

// Comienza la cadena de middlewares
app.use(bodyParser.urlencoded({extended: false}));      // Se define que se utilice el bodyParser (middleware)
app.use(cookieParser());                                // Se define que se utilice el cookieParser (middleware)
app.use(express.static(staticFiles));                   // Se define que se usen esa ruta de ficheros estaticos (middleware)

/*
// Para las sesiones
const sessionMiddleware = session({                     // Se define la configuracion de la sesion
    saveUninitialized: false,
    secret: 'hermyx',
    resave: false,
    store: sessionStore,
    cookie:{
        maxAge: 24 * 60 * 60 * 1000                     // Por defecto, las cookies son de un dia
    }
});
app.use(sessionMiddleware);                             // Se define que se use esa sesion (middleware)
app.use(dynamicBodyMiddleware);                         // Se define el body dinamico*/

// Middleware para exponer la sesión a las plantillas
app.use((request, response, next) => {
    response.locals.user = request.session.user || null;
    next();
});

// Middlewares para responder a las peticiones, definir routers o usar middlewares intermedios necesarios
app.get("/", function(request, response){
    response.render("homeView", {});    // Los render envian el status 200 automaticamente
});

// Gestion de usuarios

// Gestion de errores

/*
// Ruta inexistente, 404
app.use((req, res) =>{
  res.status(404);
  res.render(`error/404`, {url: req.url});
});

// Error basico en el servidor, 505
app.use((err, req, res, next) =>{
  console.error(`Error en el servidor: ${err.stack}`);
 res.render(`error/505`);
});*/

// Se abre el servidor para que escuche en el puerto correspondiente
app.listen(PORT, function(err){
    if(err)
        console.log(`Error al abrir el servidor en el puerto ${PORT}: ${err}`);
    else
        console.log(`Servidor escuchando en el puerto ${PORT}`);
});