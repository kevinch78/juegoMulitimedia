export default class LevelManager {
    constructor(experience) {
        this.experience = experience;
        this.currentLevel = 1;
        this.totalLevels = 3; // ✨ AHORA TENEMOS 3 NIVELES

        // Bug 3 Fix: Define spawn points for each level
        this.spawnPoints = {
            1: { x: -17, y: 1.5, z: -67 }, // Punto de spawn para el Nivel 1
            2: { x: -10, y: 1.5, z: -67 }, // Punto de spawn para el Nivel 2
            3: { x: 0, y: 1.5, z: 0 }      // ✨ NUEVO: Punto de spawn para el Nivel 3 (ajusta estas coordenadas)
        };

        // ✨ MEJORA: Configuración de enemigos por nivel desde .env con fallback
        const enemiesLvl1 = parseInt(import.meta.env.VITE_ENEMIES_LVL_1, 10) || 5;
        const enemiesLvl2 = parseInt(import.meta.env.VITE_ENEMIES_LVL_2, 10) || 10;
        const enemiesLvl3 = parseInt(import.meta.env.VITE_ENEMIES_LVL_3, 10) || 15;

        this.enemiesPerLevel = {
            1: enemiesLvl1,
            2: enemiesLvl2,
            3: enemiesLvl3
        };
    }

    nextLevel() {
        if (this.currentLevel < this.totalLevels) {
            this.currentLevel++;
    
            // Clear the scene before loading the new level
            this.experience.world.clearCurrentScene();
            this.experience.world.loadLevel(this.currentLevel);
            // La reubicación del robot ahora se gestiona dentro de loadLevel para mayor consistencia.
        }
    }
    

    resetLevel() {
        this.currentLevel = 1;
        this.experience.world.loadLevel(this.currentLevel);
    }


    getCurrentLevelTargetPoints() {
        return this.pointsToComplete?.[this.currentLevel] || 3;
    }
    
    getSpawnPoint(level) {
        // Bug 3 Fix: Return the specific spawn point for the requested level
        return this.spawnPoints[level] || this.spawnPoints[1]; // Fallback to level 1 spawn point
    }

    getEnemiesCount(level) {
        // ✨ NUEVO: Obtener el número de enemigos para el nivel actual
        return this.enemiesPerLevel[level] || 1; // Fallback a 1 enemigo si no está definido
    }
}
