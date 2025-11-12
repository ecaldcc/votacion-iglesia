import mongoose from 'mongoose';

const options = {
  serverSelectionTimeoutMS: 10000, // Timeout si no puede conectar al servidor
  socketTimeoutMS: 60000, // Timeout para operaciones individuales
  maxPoolSize: 25,  // ← AGREGAR: Pool para 20 iglesias simultáneas
  minPoolSize: 5,   // ← AGREGAR: Mantener 5 conexiones mínimas
  retryWrites: true, // ← AGREGAR: Reintentar escrituras fallidas
  w: 'majority',    // ← AGREGAR: Garantizar escritura en mayoría de nodos
};

const connectDB = async () => {
  try {
    // Obtener URI de las variables de entorno
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI no esta definida en las variables de entorno');
    }

    // Log de conexion (oculta credenciales)
    const uriPreview = mongoURI.includes('@') 
      ? `mongodb+srv://***:***@${mongoURI.split('@')[1].split('?')[0]}...`
      : 'mongodb://localhost...';
    
    console.log(`Conectando a MongoDB: ${uriPreview}`);

    // Conectar a MongoDB
    const conn = await mongoose.connect(mongoURI, options);

    console.log(`MongoDB conectado: ${conn.connection.host}`);
    console.log(`Base de datos: ${conn.connection.name}`);
    console.log(`Pool size: ${options.maxPoolSize} conexiones`); // ← AGREGAR

    // listener para ver el estado de la conexion
    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB desconectado');
    });

    mongoose.connection.on('error', (err) => {
      console.error(' Error en MongoDB:', err.message);
    });

    // ← AGREGAR: Listener de reconexión
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconectado');
    });

    //desconectarse por cierre
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log(' MongoDB desconectado por cierre de aplicacion');
      process.exit(0);
    });

    // ← AGREGAR: También manejar SIGTERM (para Render/Heroku)
    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      console.log(' MongoDB desconectado por SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    console.error(' Error al conectar a MongoDB:', error.message);
    
    // En desarrollo, mostrar mas detalles
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    
    // Salir del proceso si no puede conectar
    process.exit(1);
  }
};

/**
 * verificar si esta o no activa la conexion
 * @returns {boolean}
 */
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * cerrar la conexion a MongoDB
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('Conexion a MongoDB cerrada correctamente');
  } catch (error) {
    console.error(' Error al cerrar conexion:', error.message);
    throw error;
  }
};

export default connectDB;