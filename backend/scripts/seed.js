import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB, { disconnectDB } from '../config/conexion.js';
import User from '../models/user.js';
import Iglesia from '../models/iglesia.js';
import Campaign from '../models/campaing.js';
import Vote from '../models/vote.js';

const seedDatabase = async () => {
  try {
    console.log('🌱 Iniciando seed de base de datos...\n');

    await connectDB();

    console.log('🧹 Limpiando base de datos...');
    await User.deleteMany({});
    await Iglesia.deleteMany({});
    await Campaign.deleteMany({});
    await Vote.deleteMany({});
    console.log('✅ Base de datos limpiada\n');

    // ========================================
    // CREAR USUARIO ADMINISTRADOR
    // ========================================
    console.log('👤 Creando usuario administrador...');
    const admin = await User.create({
      numeroColegiado: 'ADMIN',
      nombreCompleto: 'Administrador Sistema',
      correo: 'admin@iglesias.gt',
      dpi: '1234567890101',
      fechaNacimiento: new Date('1990-01-01'),
      password: 'Admin123',
      role: 'admin',
      isActive: true
    });
    console.log('✅ Administrador creado\n');

    // ========================================
    // CREAR 20 IGLESIAS
    // ========================================
    console.log('⛪ Creando 20 iglesias...');
    
    const iglesiasData = [
      { codigo: 'IG001', nombre: 'Senda Milagrosa', votosAsignados: 85, password: 'senda123' },
      { codigo: 'IG002', nombre: 'Fuente de Vida', votosAsignados: 92, password: 'fuente123' },
      { codigo: 'IG003', nombre: 'Nuevo Amanecer', votosAsignados: 78, password: 'amanecer123' },
      { codigo: 'IG004', nombre: 'Casa de Oración', votosAsignados: 65, password: 'oracion123' },
      { codigo: 'IG005', nombre: 'Monte Sión', votosAsignados: 88, password: 'sion123' },
      { codigo: 'IG006', nombre: 'Luz del Mundo', votosAsignados: 95, password: 'luz123' },
      { codigo: 'IG007', nombre: 'Puerta del Cielo', votosAsignados: 72, password: 'puerta123' },
      { codigo: 'IG008', nombre: 'Roca Eterna', votosAsignados: 80, password: 'roca123' },
      { codigo: 'IG009', nombre: 'Manantial de Vida', votosAsignados: 90, password: 'manantial123' },
      { codigo: 'IG010', nombre: 'Estrella de Belén', votosAsignados: 67, password: 'estrella123' },
      { codigo: 'IG011', nombre: 'Fuego Santo', votosAsignados: 75, password: 'fuego123' },
      { codigo: 'IG012', nombre: 'Camino de Fe', votosAsignados: 82, password: 'camino123' },
      { codigo: 'IG013', nombre: 'Árbol de Vida', votosAsignados: 70, password: 'arbol123' },
      { codigo: 'IG014', nombre: 'Lirio de los Valles', votosAsignados: 86, password: 'lirio123' },
      { codigo: 'IG015', nombre: 'Pan de Vida', votosAsignados: 93, password: 'pan123' },
      { codigo: 'IG016', nombre: 'Sal de la Tierra', votosAsignados: 68, password: 'sal123' },
      { codigo: 'IG017', nombre: 'Piedra Angular', votosAsignados: 77, password: 'piedra123' },
      { codigo: 'IG018', nombre: 'Viña del Señor', votosAsignados: 84, password: 'vina123' },
      { codigo: 'IG019', nombre: 'Arca de Salvación', votosAsignados: 89, password: 'arca123' },
      { codigo: 'IG020', nombre: 'Templo Vivo', votosAsignados: 91, password: 'templo123' },
    ];

    const iglesias = [];
    for (const data of iglesiasData) {
      const iglesia = await Iglesia.create({
        ...data,
        isActive: true
      });
      iglesias.push(iglesia);
      console.log(`✅ Iglesia creada: ${iglesia.nombre} (${iglesia.votosAsignados} votos)`);
    }

    console.log(`\n✅ ${iglesias.length} iglesias creadas\n`);

    // Calcular total de votos asignados
    const totalVotosAsignados = iglesias.reduce((sum, ig) => sum + ig.votosAsignados, 0);
    console.log(`📊 Total de votos asignados: ${totalVotosAsignados}\n`);

    // ========================================
    // CREAR CAMPAÑA DE EJEMPLO
    // ========================================
    console.log('🗳️ Creando campaña de ejemplo...');
    
    const now = new Date();
    const fechaFin = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const campaign = await Campaign.create({
      titulo: 'Elección Junta Directiva 2025',
      descripcion: 'Elección de presidente de la asociación de iglesias para el periodo 2025-2027',
      estado: 'habilitada',
      fechaInicio: now,
      fechaFin: fechaFin,
      candidatos: [
        {
          nombre: 'Pastor José Hernández',
          foto: 'https://ui-avatars.com/api/?name=Jose+Hernandez&background=4f46e5&color=fff&size=200',
          propuestas: 'Unidad y crecimiento espiritual de todas las iglesias',
          votos: 0
        },
        {
          nombre: 'Pastora María Rodríguez',
          foto: 'https://ui-avatars.com/api/?name=Maria+Rodriguez&background=059669&color=fff&size=200',
          propuestas: 'Fortalecimiento de la comunión fraternal',
          votos: 0
        },
        {
          nombre: 'Pastor Carlos Mendoza',
          foto: 'https://ui-avatars.com/api/?name=Carlos+Mendoza&background=dc2626&color=fff&size=200',
          propuestas: 'Expansión del evangelio y misiones',
          votos: 0
        }
      ],
      totalVotos: 0,
      votosPorIglesia: [],
      createdBy: admin._id
    });

    console.log('✅ Campaña creada\n');

    // ========================================
    // RESUMEN
    // ========================================
    console.log('═'.repeat(70));
    console.log('✅ SEED COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(70));
    console.log('\n📋 CREDENCIALES DE PRUEBA:\n');
    
    console.log('🔑 ADMINISTRADOR:');
    console.log('Código: ADMIN');
    console.log('Password: Admin123\n');
    
    console.log('⛪ IGLESIAS (20 total):');
    console.log('─'.repeat(70));
    iglesiasData.forEach(ig => {
      console.log(`${ig.codigo} - ${ig.nombre.padEnd(25)} | Password: ${ig.password.padEnd(15)} | Votos: ${ig.votosAsignados}`);
    });
    console.log('─'.repeat(70));
    console.log(`\n📊 TOTAL DE VOTOS DISPONIBLES: ${totalVotosAsignados}`);
    console.log('═'.repeat(70));

    await disconnectDB();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en seed:', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();