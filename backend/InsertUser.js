// insertUser.js

import mongoose from 'mongoose';
import User from './models/user';


const run = async () => {
  try {
    // Conexion local (el mismo de .env)
    await mongoose.connect('mongodb://127.0.0.1:27017/sistema-votacion');

    // Crear un usuario de prueba
    const newUser = await User.create({
      numeroColegiado: "002",
      nombreCompleto: "Juan Prez",
      correo: "jn@correo.com",
      dpi: "1234567890143",
      fechaNacimiento: new Date("1993-05-20"),
      password: "12345678"
    });

    console.log("Usuario creado:", newUser);
    mongoose.connection.close();
  } catch (error) {
    console.error(" Error:", error);
  }
};

run();
