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
}
