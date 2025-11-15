# 🗄️ Script de Inicialización de Base de Datos

Este script crea las colecciones (tablas) de **Users** y **Blocks** en MongoDB con sus índices necesarios.

## 📋 Requisitos Previos

1. Tener MongoDB instalado y corriendo
2. Tener un archivo `.env` en la carpeta `backend/` con la variable `MONGO_URI`

### Ejemplo de `.env`:

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/nombre-de-tu-base-de-datos
JWT_SECRET=tu_clave_secreta_super_segura
REQUIRE_AUTH=false
```

## 🚀 Cómo Ejecutar

### Opción 1: Usando npm script (Recomendado)

```bash
cd backend
npm run init-db
```

### Opción 2: Ejecutar directamente con Node

```bash
cd backend
node init-db.js
```

## ✅ Qué Hace el Script

1. **Conecta a MongoDB** usando la URI del archivo `.env`
2. **Crea los índices** para la colección `users`:
   - Índice único en `username`
   - Índice único en `email`
3. **Crea los índices** para la colección `blocks`:
   - Índice en `level` (para búsquedas rápidas por nivel)
4. **Verifica** que las colecciones se crearon correctamente
5. **Muestra un resumen** del estado de la base de datos

## 📊 Estructura de las Colecciones

### Users
- `username` (String, único, requerido)
- `email` (String, único, requerido)
- `password` (String, requerido)
- `accessLevel` (Number, default: 1)

### Blocks
- `name` (String)
- `x` (Number)
- `y` (Number)
- `z` (Number)
- `level` (Number, requerido, default: 1)
- `role` (String, enum: ['finalPrize', 'default'], default: 'default')

## ⚠️ Notas Importantes

- El script **no elimina datos existentes**
- Las colecciones se crean automáticamente al crear los índices
- Si las colecciones ya existen, solo se verificarán/crearán los índices
- Si MongoDB no está corriendo, el script mostrará un error con instrucciones

## 🐛 Solución de Problemas

### Error: "MongoNetworkError" o "ECONNREFUSED"
- Verifica que MongoDB esté corriendo: `mongod` o servicio de MongoDB activo
- Verifica que la URI en `.env` sea correcta

### Error: "Authentication failed"
- Verifica las credenciales en `MONGO_URI` si usas autenticación

### Las colecciones no aparecen
- Esto es normal si no hay datos aún
- Las colecciones se crearán automáticamente al insertar el primer documento

## 📝 Siguiente Paso

Después de ejecutar este script, puedes:
- Ejecutar `npm run seed` para insertar datos de ejemplo (opcional)
- Iniciar el servidor con `node app.js`

