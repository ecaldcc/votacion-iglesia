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
    // CREAR 2 USUARIOS ADMINISTRADORES
    // ========================================
    console.log('👤 Creando usuarios administradores...');
    
    const admin1 = await User.create({
      numeroColegiado: 'ADM001',
      nombreCompleto: 'Administrador Principal',
      correo: 'admin1@iglesias.gt',
      dpi: '1234567890101',
      fechaNacimiento: new Date('1990-01-01'),
      password: 'cambio123',
      role: 'admin',
      isActive: true
    });
    console.log('✅ Admin 1 creado: ADM001');

    const admin2 = await User.create({
      numeroColegiado: 'ADM002',
      nombreCompleto: 'Administrador Secundario',
      correo: 'admin2@iglesias.gt',
      dpi: '1234567890102',
      fechaNacimiento: new Date('1992-05-15'),
      password: 'edwar777',
      role: 'admin',
      isActive: true
    });
    console.log('✅ Admin 2 creado: ADM002\n');

    // ========================================
    // CREAR 15 IGLESIAS CON DATOS REALES
    // ========================================
    console.log('⛪ Creando 15 iglesias...');
    
    const iglesiasData = [
      { codigo: 'IG001', nombre: 'Salem', votosAsignados: 35, password: 'salem123' },
      { codigo: 'IG002', nombre: 'Luz Admirable', votosAsignados: 18, password: 'luz123' },
      { codigo: 'IG003', nombre: 'Alfa y Omega', votosAsignados: 20, password: 'alfa123' },
      { codigo: 'IG004', nombre: 'Zoar', votosAsignados: 13, password: 'zoar123' },
      { codigo: 'IG005', nombre: 'Fuente de Vida', votosAsignados: 48, password: 'fuente123' },
      { codigo: 'IG006', nombre: 'Shaddai', votosAsignados: 23, password: 'shaddai123' },
      { codigo: 'IG007', nombre: 'Senda Milagrosa', votosAsignados: 61, password: 'senda123' },
      { codigo: 'IG008', nombre: 'Samaria', votosAsignados: 25, password: 'samaria123' },
      { codigo: 'IG009', nombre: 'Sol de Justicia', votosAsignados: 40, password: 'sol123' },
      { codigo: 'IG010', nombre: 'Peniel', votosAsignados: 20, password: 'peniel123' },
      { codigo: 'IG011', nombre: 'El Edén', votosAsignados: 20, password: 'eden123' },
      { codigo: 'IG012', nombre: 'Monte Los Olivos', votosAsignados: 25, password: 'monte123' },
      { codigo: 'IG013', nombre: 'Belén', votosAsignados: 25, password: 'belen123' },
      { codigo: 'IG014', nombre: 'Camino de Salvación', votosAsignados: 10, password: 'camino123' },
      { codigo: 'IG015', nombre: 'Galilea', votosAsignados: 25, password: 'galilea123' },
      { codigo: 'CONT1', nombre: 'Contingencia', votosAsignados: 50, password: 'Guatemala6.' },
    ];

    const iglesias = [];
    for (const data of iglesiasData) {
      const iglesia = await Iglesia.create({
        ...data,
        isActive: true
      });
      iglesias.push(iglesia);
      console.log(`✅ Iglesia creada: ${iglesia.nombre.padEnd(25)} - ${String(iglesia.votosAsignados).padStart(2)} votos`);
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
          nombre: 'Pedro Sanabria',
          foto: 'https://i.ibb.co/rG2pr86Y/Pedro-Sanabria.jpg',
          propuestas: 'Pastor - AD Salem',
          votos: 0
        },
        {
          nombre: 'Jimmy García',
          foto: 'https://i.ibb.co/V0JsMPgs/Jimmy-Garcia.jpg',
          propuestas: 'Pastor Asistente - AD Samaria',
          votos: 0
        },
        {
          nombre: 'Adonias Montepeque',
          foto: 'https://i.ibb.co/x8rDN0Wd/Adonias-Montepeque.jpg',
          propuestas: 'Pastor - AD Alfa y Omega',
          votos: 0
        },
        {
          nombre: 'Samuel Cotzajay',
          foto: 'https://i.ibb.co/ZzxdqYvn/Samuel-Cotzajay.jpg',
          propuestas: 'Pastor Asistente - AD Senda Milagrosa',
          votos: 0
        },
        {
          nombre: 'Franquil Baten',
          foto: 'https://i.ibb.co/dJ2vK6Xw/Franquil-Baten.jpg',
          propuestas: 'Pastor - AD Emmanuel',
          votos: 0
        }
      ],
      totalVotos: 0,
      votosPorIglesia: [],
      createdBy: admin1._id
    });

    console.log('✅ Campaña creada\n');

    // ========================================
    // RESUMEN
    // ========================================
    console.log('═'.repeat(90));
    console.log('✅ SEED COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(90));
    console.log('\n📋 CREDENCIALES DE PRUEBA:\n');
    
    console.log('🔑 ADMINISTRADORES (2):');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │ Usuario: ADM001                         │');
    console.log('   │ Password: cambio123                     │');
    console.log('   └─────────────────────────────────────────┘');
    console.log('   ┌─────────────────────────────────────────┐');
    console.log('   │ Usuario: ADM002                         │');
    console.log('   │ Password: edwar98                       │');
    console.log('   └─────────────────────────────────────────┘\n');
    
    console.log('⛪ IGLESIAS (15 total):');
    console.log('─'.repeat(90));
    iglesiasData.forEach(ig => {
      console.log(`   ${ig.codigo} - ${ig.nombre.padEnd(25)} | Password: ${ig.password.padEnd(14)} | Votos: ${String(ig.votosAsignados).padStart(2)}`);
    });
    console.log('─'.repeat(90));
    
    console.log('\n👥 CANDIDATOS (5 total):');
    console.log('─'.repeat(90));
    console.log('   1. Pedro Sanabria');
    console.log('   2. Jimmy García');
    console.log('   3. Adonias Montepeque');
    console.log('   4. Samuel Cotzajay');
    console.log('   5. Franquil Baten');
    console.log('─'.repeat(90));
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total Administradores: 2`);
    console.log(`   Total Iglesias: ${iglesias.length}`);
    console.log(`   Total Votos Disponibles: ${totalVotosAsignados}`);
    console.log(`   Total Candidatos: 5`);
    console.log(`   Campaña: Habilitada y lista para votar`);
    console.log('═'.repeat(90));

    await disconnectDB();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error en seed:', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();
