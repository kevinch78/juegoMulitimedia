import * as THREE from 'three'
import Environment from './Environment.js'
import Fox from './Fox.js'
import Personaje from './Personaje.js' // ✨ 1. Importamos el nuevo personaje
import ToyCarLoader from '../../loaders/ToyCarLoader.js'
import Floor from './Floor.js'
import ThirdPersonCamera from './ThirdPersonCamera.js'
import Sound from './Sound.js'
import AmbientSound from './AmbientSound.js'
import MobileControls from '../../controls/MobileControls.js'
import LevelManager from './LevelManager.js';
import BlockPrefab from './BlockPrefab.js'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'
import Portal from './Portal.js' // Importar la nueva clase Portal
import Enemy from './Enemy.js'
import Bomb from './bomb/Bomb.js' // 💣 Importar la clase Bomb

export default class World {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.blockPrefab = new BlockPrefab(this.experience)
        this.resources = this.experience.resources
        this.levelManager = new LevelManager(this.experience)
        this.finalPrizeActivated = false
        this.portal = null
        this._eKeyPressedForPortal = false
        this.gameStarted = false
        this.enemies = []
        this.bombs = [] // 💣 Array para guardar todas las bombas

        this.coinSound = new Sound('/sounds/coin.ogg')
        this.ambientSound = new AmbientSound('/sounds/ambiente.mp3')
        this.winner = new Sound('/sounds/winner.mp3')
        this.portalSound = new Sound('/sounds/portal.mp3')
        this.loseSound = new Sound('/sounds/lose.ogg')

        this.allowPrizePickup = false
        this.hasMoved = false

        setTimeout(() => {
            this.allowPrizePickup = true
        }, 2000)

        this.resources.on('ready', async () => {
            this.floor = new Floor(this.experience, 1)
            this.environment = new Environment(this.experience)

            this.loader = new ToyCarLoader(this.experience)
            await this.loader.loadFromAPI()

            this.fox = new Fox(this.experience)
            this.robot = new Personaje(this.experience)

            this.fox.setTarget(this.robot)
 
            this.enemyTemplate = this.resources.items.enemyModel
            console.log("🎬 Animaciones del modelo enemigo:", this.enemyTemplate.animations.map(a => a.name))
            
            const initialEnemiesCount = this.levelManager.getEnemiesCount(1)
            this.spawnEnemies(initialEnemiesCount)

            this.experience.vr.bindCharacter(this.robot)
            this.thirdPersonCamera = new ThirdPersonCamera(this.experience, this.robot.group)

            this.mobileControls = new MobileControls({
                onUp: (pressed) => { this.experience.keyboard.keys.up = pressed },
                onDown: (pressed) => { this.experience.keyboard.keys.down = pressed },
                onLeft: (pressed) => { this.experience.keyboard.keys.left = pressed },
                onRight: (pressed) => { this.experience.keyboard.keys.right = pressed }
            })

            if (!this.experience.physics || !this.experience.physics.world) {
                console.error("🚫 Sistema de físicas no está inicializado al cargar el mundo.")
                return
            }

            this._checkVRMode()

            this.experience.renderer.instance.xr.addEventListener('sessionstart', () => {
                this._checkVRMode()
            })
        })
    }

    spawnEnemies(count = 3) {
        if (!this.robot?.body?.position || !this.floor?.mesh) {
            console.warn('⚠️ No se puede spawnear enemigos: el robot o el suelo no están listos.')
            return
        }
        if (!this.enemyTemplate) {
            console.warn('⚠️ Modelo de enemigo no cargado aún')
            return
        }

        if (this.enemies?.length) {
            this.enemies.forEach(e => e?.destroy?.())
            this.enemies = []
        }

        const playerPos = this.robot.body.position
        const minRadius = 20
        const maxRadius = 50
        const raycaster = new THREE.Raycaster()
        const downVector = new THREE.Vector3(0, -1, 0)
        const floorMeshes = [this.floor.mesh]

        for (let i = 0; i < count; i++) {
            let spawnPosition = null
            let attempts = 0

            while (!spawnPosition && attempts < 20) {
                const angle = Math.random() * Math.PI * 2
                const radius = minRadius + Math.random() * (maxRadius - minRadius)
                const candidateX = playerPos.x + Math.cos(angle) * radius
                const candidateZ = playerPos.z + Math.sin(angle) * radius
                
                raycaster.set(new THREE.Vector3(candidateX, 50, candidateZ), downVector)
                const intersects = raycaster.intersectObjects(floorMeshes)

                if (intersects.length > 0) {
                    spawnPosition = intersects[0].point
                    spawnPosition.y += 1.0
                }
                attempts++
            }

            if (!spawnPosition) continue

            const enemy = new Enemy({
                scene: this.scene,
                physicsWorld: this.experience.physics.world,
                playerRef: this.robot,
                model: this.enemyTemplate.scene,
                position: spawnPosition,
                experience: this.experience
            })

            enemy.delayActivation = 1.0 + i * 0.5
            this.enemies.push(enemy)
        }
    }

    // 💣 NUEVO MÉTODO: Spawnear bombas
    spawnBombs(positions) {
        // Limpiar bombas anteriores
        if (this.bombs?.length) {
            this.bombs.forEach(bomb => bomb?.destroy?.())
            this.bombs = []
        }

        // Crear nuevas bombas
        positions.forEach(pos => {
            const bomb = new Bomb({
                scene: this.scene,
                physicsWorld: this.experience.physics.world,
                position: new THREE.Vector3(pos.x, pos.y || 0.6, pos.z),
                experience: this.experience,
                onExplode: (bomb) => {
                    console.log('💥 Bomba explotó, removiendo del array...')
                    const index = this.bombs.indexOf(bomb)
                    if (index > -1) {
                        this.bombs.splice(index, 1)
                    }
                }
            })
            
            this.bombs.push(bomb)
        })

        console.log(`💣 ${positions.length} bombas spawneadas en el nivel`)
    }

    toggleAudio() {
        this.ambientSound.toggle()
    }

    update(delta) {
        this.fox?.update()
        this.robot?.update()
        this.blockPrefab?.update()

        if (this.gameStarted) {
            this.enemies?.forEach(e => e.update(delta))

            // 💣 NUEVO: Actualizar bombas
            if (this.bombs?.length) {
                this.bombs.forEach(bomb => bomb.update(delta))
            }

            const distToClosest = this.enemies?.reduce((min, e) => {
                if (!e?.body?.position || !this.robot?.body?.position) return min
                const d = e.body.position.distanceTo(this.robot.body.position)
                return Math.min(min, d)
            }, Infinity) ?? Infinity

            if (distToClosest < 1.0 && !this.defeatTriggered) {
                this.defeatTriggered = true
            
                if (window.userInteracted && this.loseSound) {
                    this.loseSound.play()
                }
            
                if (this.robot?.body) {
                    this.robot.body.velocity.set(0, 0, 0)
                    this.robot.body.angularVelocity.set(0, 0, 0)
                }
            
                this.robot?.die()
            
                const firstEnemy = this.enemies?.[0]
                const enemyMesh = firstEnemy?.model || firstEnemy?.group
                if (enemyMesh) {
                    enemyMesh.scale.set(1.3, 1.3, 1.3)
                    setTimeout(() => {
                        enemyMesh.scale.set(1, 1, 1)
                    }, 500)
                }
            
                const modal = this.experience?.modal
                const worldInstance = this
            
                setTimeout(() => {
                    if (!modal) {
                        console.error('❌ Modal no disponible. No se puede mostrar el mensaje de derrota.')
                        return
                    }
                    
                    if (typeof modal.show !== 'function') {
                        console.error('❌ Modal.show no es una función.')
                        return
                    }
                    
                    try {
                        modal.show({
                            icon: '💀',
                            message: '¡El enemigo te atrapó!\n¿Quieres intentarlo otra vez?',
                            buttons: [
                                {
                                    text: '🔁 Reintentar',
                                    onClick: () => {
                                        worldInstance.resetCurrentLevel()
                                    }
                                },
                                {
                                    text: '❌ Salir',
                                    onClick: () => worldInstance.experience.resetGame()
                                }
                            ]
                        })
                    } catch (error) {
                        console.error('❌ Error al mostrar modal de derrota:', error)
                    }
                }, 1000)
            }

            // 💣 NUEVO: Verificar colisiones con bombas
            const playerPos = this.experience.renderer.instance.xr.isPresenting
                ? this.experience.camera.instance.position
                : this.robot?.body?.position

            if (playerPos && this.bombs?.length) {
                this.bombs.forEach(bomb => {
                    if (bomb.checkCollision(playerPos) && !this.defeatTriggered) {
                        this.defeatTriggered = true
                        
                        // 💥 Muerte por bomba
                        if (window.userInteracted && this.loseSound) {
                            this.loseSound.play()
                        }
                        
                        // Detener movimiento del robot
                        if (this.robot?.body) {
                            this.robot.body.velocity.set(0, 0, 0)
                            this.robot.body.angularVelocity.set(0, 0, 0)
                        }
                        
                        // Ejecutar animación de muerte
                        this.robot?.die()
                        
                        const modal = this.experience?.modal
                        const worldInstance = this
                        
                        setTimeout(() => {
                            if (!modal) {
                                console.error('❌ Modal no disponible')
                                return
                            }
                            
                            try {
                                modal.show({
                                    icon: '💥',
                                    message: '¡Una bomba explotó!\n¿Quieres intentarlo otra vez?',
                                    buttons: [
                                        {
                                            text: '🔁 Reintentar',
                                            onClick: () => worldInstance.resetCurrentLevel()
                                        },
                                        {
                                            text: '❌ Salir',
                                            onClick: () => worldInstance.experience.resetGame()
                                        }
                                    ]
                                })
                            } catch (error) {
                                console.error('❌ Error al mostrar modal:', error)
                            }
                        }, 1000)
                    }
                })
            }
        }

        this.portal?.update()
        if (this.thirdPersonCamera && this.experience.isThirdPerson && !this.experience.renderer.instance.xr.isPresenting) {
            this.thirdPersonCamera.update()
        }

        this.loader?.prizes?.forEach(p => p.update(delta))

        if (!this.allowPrizePickup || !this.loader || !this.robot || !this.robot.body) return

        let pos = null

        if (this.experience.renderer.instance.xr.isPresenting) {
            pos = this.experience.camera.instance.position
        } else if (this.robot?.body?.position) {
            pos = this.robot.body.position
        } else {
            return
        }

        const speed = this.robot?.body?.velocity?.length?.() || 0
        const moved = speed > 0.5

        this.loader.prizes.forEach((prize) => {
            if (!prize.pivot) return
        
            const dist = prize.pivot.position.distanceTo(pos)
            if (dist < 1.2 && moved && !prize.collected) {
                prize.collect()
                prize.collected = true
        
                if (prize.role === "default") {
                    this.points = (this.points || 0) + 1
                    this.robot.points = this.points
        
                    const pointsTarget = this.totalDefaultCoins || this.levelManager.getCurrentLevelTargetPoints()
                    console.log(`🎯 Monedas recolectadas: ${this.points} / ${pointsTarget}`)
        
                    if (!this.finalPrizeActivated && this.points === pointsTarget) {
                        console.log('🏆 ¡Monedas completadas! Aparece el premio final...')
                        const finalCoin = this.loader.prizes.find(p => p.role === "finalPrize")
                        if (finalCoin?.pivot) {
                            finalCoin.pivot.visible = true
                            this.finalPrizeActivated = true
                            new FinalPrizeParticles({
                                scene: this.scene,
                                targetPosition: finalCoin.pivot.position,
                                sourcePosition: finalCoin.pivot.position,
                                experience: this.experience
                            })
                        }
                    }
                } else if (prize.role === "finalPrize") {
                    console.log('🌀 ¡Premio final recolectado! Activando portal...')
                    
                    const portalPosition = prize.pivot.position.clone()
                    if (!this.portal) {
                        this.portal = new Portal(this.experience, portalPosition, this.levelManager.currentLevel)
                        
                        if (window.userInteracted) {
                            this.portalSound.play()
                        }
                        
                        console.log('✨ Portal creado en:', portalPosition)
                    }
                }
        
                if (prize.role === "finalPrize" && prize.collected) {
                    return
                }
        
                if (window.userInteracted) {
                    this.coinSound.play()
                }
        
                this.experience.menu.setStatus?.(`🎖️ Puntos: ${this.points}`)
            }
        })

        if (this.portal && this.portal.model) {
            const portalDist = this.portal.position.distanceTo(pos)
            const keys = this.experience.keyboard.getState()
            
            if (portalDist < 2.5 && keys.e) {
                if (!this._eKeyPressedForPortal) {
                    this.teleportToNextLevel()
                    this._eKeyPressedForPortal = true
                }
            } else if (!keys.e) {
                this._eKeyPressedForPortal = false
            }
        }

        const playerPosOpt = this.experience.renderer.instance.xr.isPresenting
            ? this.experience.camera.instance.position
            : this.robot?.body?.position

        this.scene.traverse((obj) => {
            if (obj.userData?.levelObject && obj.userData.physicsBody) {
                const dist = obj.position.distanceTo(playerPosOpt)
                const shouldEnable = dist < 40 && obj.visible

                const body = obj.userData.physicsBody
                if (shouldEnable && !body.enabled) {
                    body.enabled = true
                } else if (!shouldEnable && body.enabled) {
                    body.enabled = false
                }
            }
        })
    }

    teleportToNextLevel() {
        console.log("🚀 Teletransportando al siguiente nivel...")
        if (this.levelManager.currentLevel < this.levelManager.totalLevels) {
            this.levelManager.nextLevel()
            this.points = 0
            if (this.robot) this.robot.points = 0
        } else {
            const elapsed = this.experience.tracker.stop()
            this.experience.tracker.saveTime(elapsed)
            this.experience.tracker.showEndGameModal(elapsed)

            this.experience.obstacleWavesDisabled = true
            clearTimeout(this.experience.obstacleWaveTimeout)
            this.experience.raycaster?.removeAllObstacles()

            if (window.userInteracted) {
                this.winner.play()
            }
        }
        if (this.portal) {
            this.portal.destroy()
            this.portal = null
        }
        this.finalPrizeActivated = false
    }

    async loadLevel(level) {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
            const apiUrl = `${backendUrl}/api/blocks?level=${level}`

            let data
            try {
                const res = await fetch(apiUrl)
                if (!res.ok) throw new Error('Error desde API')
                const ct = res.headers.get('content-type') || ''
                if (!ct.includes('application/json')) {
                    const preview = (await res.text()).slice(0, 120)
                    throw new Error(`Respuesta no-JSON desde API (${apiUrl}): ${preview}`)
                }
                data = await res.json()
                console.log(`📦 Datos del nivel ${level} cargados desde API`)
            } catch (error) {
                console.warn(`⚠️ No se pudo conectar con el backend. Usando datos locales para nivel ${level}...`, error.message)
                const publicPath = (p) => {
                    const base = import.meta.env.BASE_URL || '/'
                    return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`
                }

                const localUrl = publicPath('data/toy_car_blocks.json')
                const localRes = await fetch(localUrl)
                if (!localRes.ok) {
                    const preview = (await localRes.text()).slice(0, 120)
                    throw new Error(`No se pudo cargar ${localUrl} (HTTP ${localRes.status}). Vista previa: ${preview}`)
                }
                const localCt = localRes.headers.get('content-type') || ''
                if (!localCt.includes('application/json')) {
                    const preview = (await localRes.text()).slice(0, 120)
                    throw new Error(`Contenido no JSON en ${localUrl}. Vista previa: ${preview}`)
                }
                const allBlocks = await localRes.json()

                const filteredBlocks = allBlocks.filter(b => b.level === level)

                data = {
                    blocks: filteredBlocks,
                    spawnPoint: this.levelManager.getSpawnPoint(level) || { x: -17, y: 1.5, z: -67 }
                }
            }

            const spawnPoint = data.spawnPoint || this.levelManager.getSpawnPoint(level)
            this.points = 0
            this.robot.points = 0
            this.finalPrizeActivated = false
            this.experience.menu?.setStatus?.(`🎖️ Puntos: 0`)
            this.experience.menu?.setLevelStatus?.(level)
            
            if (this.floor) {
                this.floor.updateLevel(level)
                console.log(`🎨 Textura del piso actualizada para nivel ${level}`)
            }

            if (data.blocks) {
                const publicPath = (p) => {
                    const base = import.meta.env.BASE_URL || '/'
                    return `${base.replace(/\/$/, '')}/${p.replace(/^\//, '')}`
                }
                const preciseUrl = publicPath('config/precisePhysicsModels.json')
                const preciseRes = await fetch(preciseUrl)
                if (!preciseRes.ok) {
                    const preview = (await preciseRes.text()).slice(0, 120)
                    throw new Error(`No se pudo cargar ${preciseUrl} (HTTP ${preciseRes.status}). Vista previa: ${preview}`)
                }
                const preciseCt = preciseRes.headers.get('content-type') || ''
                if (!preciseCt.includes('application/json')) {
                    const preview = (await preciseRes.text()).slice(0, 120)
                    throw new Error(`Contenido no JSON en ${preciseUrl}. Vista previa: ${preview}`)
                }
                const preciseModels = await preciseRes.json()
                this.loader._processBlocks(data.blocks, preciseModels)
            } else {
                await this.loader.loadFromURL(apiUrl)
            }

            this.loader.prizes.forEach(p => {
                if (p.pivot) {
                    p.pivot.visible = (p.role !== 'finalPrize')
                }
                p.collected = false
            })

            this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === "default").length
            console.log(`🎯 Total de monedas default para el nivel ${level}: ${this.totalDefaultCoins}`)

            const enemiesCount = this.levelManager.getEnemiesCount(level)
            this.spawnEnemies(enemiesCount)
             if (level === 2) {
                const bombPositions = [
                    { x: 20, z: 25 },
                    { x: -25, z: 30 },
                    { x: 15, z: -20 },
                    { x: -30, z: -25 },
                    { x: 35, z: 10 },
                    { x: -15, z: 35 },
                    { x: 28, z: -15 },
                    { x: -35, z: 15 },
                    { x: 10, z: 40 },
                    { x: -20, z: -30 },
                    { x: 30, z: 20 },
                    { x: -10, z: -35 },
                    { x: 40, z: 15 },
                    { x: -40, z: 30},
                ]
                this.spawnBombs(bombPositions)
            } else if (level === 3) {
                const bombPositions = [
                    { x: 13,  z: 15 },   
                    { x: -9,  z: 18 },   
                    { x: 11,  z: -7 },   
                    { x: -12, z: -5 },   
                    { x: 21,  z: 8 },    
                    { x: -5,  z: 21 },   
                    { x: -7,  z: 23 },  
                    { x: -12, z: 23 }    


                ]
                this.spawnBombs(bombPositions)
            }

            this.resetRobotPosition(spawnPoint)
            console.log(`✅ Nivel ${level} cargado con spawn en`, spawnPoint)
        } catch (error) {
            console.error('❌ Error cargando nivel:', error)
        }
    }

    clearCurrentScene() {
        if (!this.experience || !this.scene || !this.experience.physics || !this.experience.physics.world) {
            console.warn('⚠️ No se puede limpiar: sistema de físicas no disponible.')
            return
        }

        let visualObjectsRemoved = 0
        let physicsBodiesRemoved = 0

        const childrenToRemove = []

        this.scene.children.forEach((child) => {
            if (child.userData && child.userData.levelObject) {
                childrenToRemove.push(child)
            }
        })

        childrenToRemove.forEach((child) => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose())
                } else {
                    child.material.dispose()
                }
            }

            this.scene.remove(child)

            if (child.userData.physicsBody) {
                this.experience.physics.world.removeBody(child.userData.physicsBody)
            }

            visualObjectsRemoved++
        })

        let physicsBodiesRemaining = -1

        if (this.experience.physics && this.experience.physics.world && Array.isArray(this.experience.physics.bodies)) {
            const survivingBodies = []
            let bodiesBefore = this.experience.physics.bodies.length

            this.experience.physics.bodies.forEach((body) => {
                if (body.userData && body.userData.levelObject) {
                    this.experience.physics.world.removeBody(body)
                    physicsBodiesRemoved++
                } else {
                    survivingBodies.push(body)
                }
            })

            this.experience.physics.bodies = survivingBodies

            console.log(`🧹 Physics Cleanup Report:`)
            console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`)
            console.log(`🎯 Cuerpos físicos sobrevivientes: ${survivingBodies.length}`)
            console.log(`📦 Estado inicial: ${bodiesBefore} cuerpos → Estado final: ${survivingBodies.length} cuerpos`)
        } else {
            console.warn('⚠️ Physics system no disponible o sin cuerpos activos, omitiendo limpieza física.')
        }

        console.log(`🧹 Escena limpiada antes de cargar el nuevo nivel.`)
        console.log(`✅ Objetos 3D eliminados: ${visualObjectsRemoved}`)
        console.log(`✅ Cuerpos físicos eliminados: ${physicsBodiesRemoved}`)
        console.log(`🎯 Objetos 3D actuales en escena: ${this.scene.children.length}`)

        if (physicsBodiesRemaining !== -1) {
            console.log(`🎯 Cuerpos físicos actuales en Physics World: ${physicsBodiesRemaining}`)
        }

        if (this.loader && this.loader.prizes.length > 0) {
            let prizesRemoved = 0
            this.loader.prizes.forEach(prize => {
                if (prize.pivot) {
                    prize.pivot.traverse((child) => {
                        if (child.geometry) {
                            child.geometry.dispose()
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose())
                            } else {
                                child.material.dispose()
                            }
                        }
                    })
                    
                    if (prize.pivot.parent) {
                        prize.pivot.parent.remove(prize.pivot)
                    }
                    prizesRemoved++
                }
            })
            this.loader.prizes = []
            console.log(`🎯 ${prizesRemoved} premios del nivel anterior eliminados correctamente.`)
        }

        if (this.enemies?.length) {
            this.enemies.forEach(e => e?.destroy?.())
            this.enemies = []
        }

        // 💣 NUEVO: Limpiar bombas
        if (this.bombs?.length) {
            this.bombs.forEach(bomb => bomb?.destroy?.())
            this.bombs = []
            console.log('💣 Bombas del nivel anterior eliminadas')
        }

        if (this.portal) {
            this.portal.destroy()
            this.portal = null
        }

        this.finalPrizeActivated = false
    }

    resetRobotPosition(spawn = { x: -17, y: 1.5, z: -67 }) {
        if (!this.robot?.body || !this.robot?.group) return

        this.robot.body.position.set(spawn.x, spawn.y, spawn.z)
        this.robot.body.velocity.set(0, 0, 0)
        this.robot.body.angularVelocity.set(0, 0, 0)
        this.robot.body.quaternion.setFromEuler(0, 0, 0)

        this.robot.group.position.set(spawn.x, spawn.y, spawn.z)
        this.robot.group.rotation.set(0, 0, 0)
    }

    resetCurrentLevel() {
        console.log('🔄 Reiniciando nivel actual...')
        
        this.defeatTriggered = false
        
        if (this.portal) {
            this.portal.destroy()
            this.portal = null
        }

        if (this.robot) {
            this.robot.reset()
        }
        
        this.enemies.forEach(enemy => {
            if (enemy.destroy) {
                enemy.destroy()
            }
        })
        this.enemies = []
        
        const enemiesCountEnv = parseInt(import.meta.env.VITE_ENEMIES_COUNT || '3', 10)
        const enemiesCount = Number.isFinite(enemiesCountEnv) && enemiesCountEnv > 0 ? enemiesCountEnv : 3
        this.spawnEnemies(enemiesCount)
        
        this.points = 0
        if(this.robot) this.robot.points = 0
        this.finalPrizeActivated = false
        
        if (this.loader?.prizes) {
            this.loader.prizes.forEach(prize => {
                if (prize.collected) {
                    prize.collected = false
                    if (prize.pivot && !prize.pivot.parent) {
                        this.scene.add(prize.pivot)
                    }
                    prize.pivot.visible = prize.role !== 'finalPrize'
                }
            })
        }

        // // 💣 NUEVO: Resetear bombas del nivel 3
        // if (this.levelManager.currentLevel === 3) {
        //     const bombPositions = [
        //         { x: 10, z: 15 },
        //         { x: -15, z: 20 },
        //         { x: 5, z: -10 },
        //         { x: -20, z: -15 },
        //         { x: 25, z: 5 },
        //         { x: -8, z: 30 },
        //         { x: 18, z: -20 },
        //         { x: -25, z: 10 }
        //     ]
        //     this.spawnBombs(bombPositions)
        // }
        
        const currentLevel = this.levelManager.currentLevel
        const spawnPoint = this.levelManager.getSpawnPoint(currentLevel)
        this.resetRobotPosition(spawnPoint)
        
        console.log('✅ Nivel reiniciado correctamente')
    }
    // 🌀 Método para obtener la posición del portal
    getPortalPosition() {
        // Opción 1: Usar la posición del finalPrize coin si existe (como marcador)
        const finalCoin = this.loader.prizes.find(p => p.role === "finalPrize")
        if (finalCoin?.pivot) {
            return finalCoin.pivot.position.clone()
        }
        
        // Opción 2: Posición fija por nivel (fallback)
        const portalPositions = {
            1: new THREE.Vector3(0, 1.5, 50),  // Nivel 1: posición de ejemplo
            2: new THREE.Vector3(0, 1.5, -50)  // Nivel 2: posición de ejemplo
        }
        
        return portalPositions[this.levelManager.currentLevel] || new THREE.Vector3(0, 1.5, 0)
    }

    async _processLocalBlocks(blocks) {
        const preciseRes = await fetch('/config/precisePhysicsModels.json');
        const preciseModels = await preciseRes.json();
        this.loader._processBlocks(blocks, preciseModels);

        this.loader.prizes.forEach(p => {
            // ✨ CORRECCIÓN: Usar p.pivot en lugar de p.model
            if (p.pivot) p.pivot.visible = (p.role !== 'finalPrize');
            p.collected = false;
        });

        this.totalDefaultCoins = this.loader.prizes.filter(p => p.role === "default").length;
        console.log(`🎯 Total de monedas default para el nivel local: ${this.totalDefaultCoins}`);
    }

    _checkVRMode() {
        const isVR = this.experience.renderer.instance.xr.isPresenting

        if (isVR) {
            if (this.robot?.group) {
                this.robot.group.visible = false
            }

            // 🔁 Delay de 3s para que no ataque de inmediato en VR
            if (this.enemy) {
                this.enemy.delayActivation = 10.0
            }

            // 🧠 Posicionar cámara correctamente
            this.experience.camera.instance.position.set(5, 1.6, 5)
            this.experience.camera.instance.lookAt(new THREE.Vector3(5, 1.6, 4))
        } else {
            if (this.robot?.group) {
                this.robot.group.visible = true
            }
        }
    }


}