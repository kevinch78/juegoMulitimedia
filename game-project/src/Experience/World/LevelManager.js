export default class LevelManager {
    constructor(experience) {
        this.experience = experience;
        this.currentLevel = 1;
        this.totalLevels = 3; 

        this.spawnPoints = {
            1: { x: -17, y: 1.5, z: -67 }, 
            2: { x: 0, y: 1.5, z: 0 }, 
            3: { x: 10, y: 1.5, z: 10 }      
        };

        const getEnvCount = (envVar, defaultValue) => {
            const value = parseInt(import.meta.env[envVar], 10);
            return !isNaN(value) ? value : defaultValue;
        };
        const enemiesLvl1 = getEnvCount('VITE_ENEMIES_LVL_1', 2);
        const enemiesLvl2 = getEnvCount('VITE_ENEMIES_LVL_2', 4);
        const enemiesLvl3 = getEnvCount('VITE_ENEMIES_LVL_3', 6);

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
