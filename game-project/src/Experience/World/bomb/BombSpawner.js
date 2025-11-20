import * as THREE from 'three'

export default class BombSpawner {
    /**
     * Genera posiciones aleatorias para bombas, evitando spawns cerca del jugador
     * @param {Object} options - Configuración
     * @param {number} options.count - Cantidad de bombas
     * @param {THREE.Vector3} options.playerPosition - Posición del jugador
     * @param {number} options.minRadius - Radio mínimo desde el jugador
     * @param {number} options.maxRadius - Radio máximo desde el jugador
     * @param {number} options.minDistance - Distancia mínima entre bombas
     * @param {Array} options.floorMeshes - Meshes para hacer raycast
     * @returns {Array<{x: number, y: number, z: number}>}
     */
    static generatePositions(options = {}) {
        const {
            count = 8,
            playerPosition = new THREE.Vector3(0, 0, 0),
            minRadius = 10,
            maxRadius = 40,
            minDistance = 5, // Mínima distancia entre bombas
            floorMeshes = null
        } = options

        const positions = []
        const raycaster = new THREE.Raycaster()
        const downVector = new THREE.Vector3(0, -1, 0)
        
        let attempts = 0
        const maxAttempts = count * 20

        while (positions.length < count && attempts < maxAttempts) {
            attempts++

            // Generar posición candidata
            const angle = Math.random() * Math.PI * 2
            const radius = minRadius + Math.random() * (maxRadius - minRadius)
            
            const candidateX = playerPosition.x + Math.cos(angle) * radius
            const candidateZ = playerPosition.z + Math.sin(angle) * radius
            const candidateY = 0.6 // Altura por defecto

            // Verificar si está muy cerca de otras bombas
            const tooClose = positions.some(pos => {
                const dist = Math.sqrt(
                    Math.pow(pos.x - candidateX, 2) + 
                    Math.pow(pos.z - candidateZ, 2)
                )
                return dist < minDistance
            })

            if (tooClose) continue

            let finalPosition = { x: candidateX, y: candidateY, z: candidateZ }

            // Si hay meshes del suelo, hacer raycast para encontrar la altura exacta
            if (floorMeshes && floorMeshes.length > 0) {
                raycaster.set(
                    new THREE.Vector3(candidateX, 50, candidateZ),
                    downVector
                )
                
                const intersects = raycaster.intersectObjects(floorMeshes)
                
                if (intersects.length > 0) {
                    finalPosition.y = intersects[0].point.y + 0.6
                } else {
                    // Si no hay intersección, saltar esta posición
                    continue
                }
            }

            positions.push(finalPosition)
        }

        if (positions.length < count) {
            console.warn(`⚠️ Solo se pudieron generar ${positions.length} de ${count} posiciones para bombas`)
        }

        return positions
    }

    /**
     * Genera un patrón de bombas en círculo alrededor del objetivo
     * @param {Object} options
     * @param {number} options.count - Cantidad de bombas
     * @param {THREE.Vector3} options.center - Centro del círculo
     * @param {number} options.radius - Radio del círculo
     * @param {number} options.startAngle - Ángulo inicial en radianes
     * @returns {Array}
     */
    static generateCirclePattern(options = {}) {
        const {
            count = 8,
            center = new THREE.Vector3(0, 0, 0),
            radius = 15,
            startAngle = 0
        } = options

        const positions = []
        const angleStep = (Math.PI * 2) / count

        for (let i = 0; i < count; i++) {
            const angle = startAngle + angleStep * i
            positions.push({
                x: center.x + Math.cos(angle) * radius,
                y: 0.6,
                z: center.z + Math.sin(angle) * radius
            })
        }

        return positions
    }

    /**
     * Genera un patrón de bombas en grid
     * @param {Object} options
     * @returns {Array}
     */
    static generateGridPattern(options = {}) {
        const {
            rows = 3,
            cols = 3,
            spacing = 8,
            center = new THREE.Vector3(0, 0, 0)
        } = options

        const positions = []
        const startX = center.x - (cols - 1) * spacing / 2
        const startZ = center.z - (rows - 1) * spacing / 2

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                positions.push({
                    x: startX + col * spacing,
                    y: 0.6,
                    z: startZ + row * spacing
                })
            }
        }

        return positions
    }

    /**
     * Genera bombas en caminos/pasillos
     * @param {Array<{x: number, z: number}>} waypoints - Puntos del camino
     * @param {number} bombsPerSegment - Bombas por segmento
     * @returns {Array}
     */
    static generatePathPattern(waypoints, bombsPerSegment = 2) {
        const positions = []

        for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i]
            const end = waypoints[i + 1]

            for (let j = 0; j < bombsPerSegment; j++) {
                const t = (j + 1) / (bombsPerSegment + 1)
                positions.push({
                    x: start.x + (end.x - start.x) * t,
                    y: 0.6,
                    z: start.z + (end.z - start.z) * t
                })
            }
        }

        return positions
    }
}

// EJEMPLO DE USO EN World.js:
/*
import BombSpawner from './BombSpawner.js'

// En loadLevel() para nivel 3:
if (level === 3) {
    // Opción 1: Posiciones aleatorias inteligentes
    const bombPositions = BombSpawner.generatePositions({
        count: 10,
        playerPosition: this.robot.body.position,
        minRadius: 15,
        maxRadius: 40,
        minDistance: 8,
        floorMeshes: [this.floor.mesh]
    })
    
    // Opción 2: Patrón circular
    // const bombPositions = BombSpawner.generateCirclePattern({
    //     count: 8,
    //     center: new THREE.Vector3(0, 0, 20),
    //     radius: 15
    // })
    
    // Opción 3: Grid
    // const bombPositions = BombSpawner.generateGridPattern({
    //     rows: 3,
    //     cols: 4,
    //     spacing: 10
    // })
    
    this.spawnBombs(bombPositions)
}
*/