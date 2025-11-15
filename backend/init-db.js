require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Block = require('./models/Block');

/**
 * Script de inicialización de base de datos
 * Crea las colecciones de Users y Blocks con sus índices
 */
async function initializeDatabase() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Crear índices para la colección Users
        // Esto también creará la colección si no existe
        console.log('📝 Creando índices para Users...');
        await User.createIndexes();
        console.log('✅ Índices de Users creados correctamente');
        
        // Verificar que los índices se crearon
        const userIndexes = await User.collection.getIndexes();
        console.log('📊 Índices de Users:', Object.keys(userIndexes));
        
        // Crear índices para la colección Blocks
        console.log('📝 Creando índices para Blocks...');
        await Block.createIndexes();
        console.log('✅ Índices de Blocks creados correctamente');
        
        // Verificar que los índices se crearon
        const blockIndexes = await Block.collection.getIndexes();
        console.log('📊 Índices de Blocks:', Object.keys(blockIndexes));
        
        // Verificar que las colecciones existen
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        console.log('\n📦 Colecciones en la base de datos:');
        collectionNames.forEach(name => {
            console.log(`   - ${name}`);
        });
        
        // Verificar que las colecciones necesarias existen
        const hasUsers = collectionNames.includes('users');
        const hasBlocks = collectionNames.includes('blocks');
        
        console.log('\n✅ Estado de las colecciones:');
        console.log(`   - users: ${hasUsers ? '✅ Existe' : '❌ No existe'}`);
        console.log(`   - blocks: ${hasBlocks ? '✅ Existe' : '❌ No existe'}`);
        
        if (hasUsers && hasBlocks) {
            console.log('\n🎉 ¡Base de datos inicializada correctamente!');
            console.log('   Las colecciones Users y Blocks están listas para usar.');
        } else {
            console.log('\n⚠️  Algunas colecciones no se crearon. Esto es normal si no hay datos aún.');
            console.log('   Las colecciones se crearán automáticamente al insertar el primer documento.');
        }
        
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('\n👋 Conexión cerrada. ¡Listo!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Error al inicializar la base de datos:');
        console.error(error.message);
        
        if (error.message.includes('MongoNetworkError') || error.message.includes('ECONNREFUSED')) {
            console.error('\n💡 Verifica que:');
            console.error('   1. MongoDB esté corriendo');
            console.error('   2. La URI en .env sea correcta (MONGO_URI)');
            console.error('   3. Tengas acceso a la base de datos');
        }
        
        process.exit(1);
    }
}

// Ejecutar la inicialización
initializeDatabase();

