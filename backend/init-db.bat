@echo off
echo ========================================
echo   Inicializacion de Base de Datos
echo   Creando tablas Users y Blocks
echo ========================================
echo.

REM Verificar que existe el archivo .env
if not exist .env (
    echo [ERROR] No se encontro el archivo .env
    echo.
    echo Por favor crea un archivo .env con la siguiente estructura:
    echo.
    echo PORT=3001
    echo MONGO_URI=mongodb://localhost:27017/nombre-de-tu-base-de-datos
    echo JWT_SECRET=tu_clave_secreta
    echo.
    pause
    exit /b 1
)

REM Ejecutar el script de inicializacion
echo Ejecutando script de inicializacion...
echo.
node init-db.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Inicializacion completada exitosamente
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Error en la inicializacion
    echo ========================================
)

echo.
pause

