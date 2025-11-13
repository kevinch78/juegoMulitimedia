import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'
import Sound from './Sound.js'

// ✅ Función de clonación manual para modelos con esqueleto
function cloneSkinnedMesh(source) {
    const cloned = source.clone()
    
    const bonemap = new Map()
    
    source.traverse((node) => {
        if (node.isBone) {
            const clonedBone = cloned.getObjectByName(node.name)
            if (clonedBone) {
                bonemap.set(node, clonedBone)
            }
        }
    })
    
    cloned.traverse((node) => {
        if (node.isSkinnedMesh) {
            const clonedBones = []
            node.skeleton.bones.forEach((bone) => {
                const clonedBone = bonemap.get(bone)
                if (clonedBone) {
                    clonedBones.push(clonedBone)
                }
            })
            
            if (clonedBones.length > 0) {
                node.skeleton = new THREE.Skeleton(clonedBones)
                node.bind(node.skeleton)
            }
        }
    })
    
    return cloned
}

export default class Enemy {
    constructor({ scene, physicsWorld, playerRef, model, position, experience }) {
        this.experience = experience
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.playerRef = playerRef
        this.baseSpeed = 1.0
        this.speed = this.baseSpeed
        this.delayActivation = 0

        // 🧠 Estados de IA
        this.state = 'patrol' // patrol, chase, attack, idle
        this.detectionRange = 15 // metros para detectar al jugador
        this.fieldOfView = Math.PI * 0.75 // 135 grados de visión
        this.loseInterestDistance = 25 // pierde interés si te alejas mucho
        
        // 🚶 Sistema de patrullaje
        this.patrolPoint = new THREE.Vector3()
        this.patrolTimer = 0
        this.patrolWaitTime = 2 // segundos esperando en cada punto
        this._generateNewPatrolPoint(position)

        // 🧱 Sistema anti-atasco
        this.stuckTimer = 0
        this.lastPosition = new THREE.Vector3()
        this.stuckThreshold = 1.0 // segundos sin moverse = atascado
        this.avoidanceTimer = 0
        this.avoidanceDirection = new THREE.Vector3()
        
        // 🎯 Raycaster para detectar paredes
        this.raycaster = new THREE.Raycaster()
        this.wallDetectionDistance = 3.0 // metros para detectar paredes

        // 🔊 Sonido de proximidad en loop
        this.proximitySound = new Sound('/sounds/alert.ogg', {
            loop: true,
            volume: 0
        })
        this.proximitySound.play()

        // 🎨 CLONAR modelo con esqueleto
        this.model = cloneSkinnedMesh(model)
        this.model.position.copy(position)
        this.model.scale.set(1, 1, 1)
        this.scene.add(this.model)

        // 🎬 Configurar animaciones
        this.mixer = null
        this.actions = {}
        this.currentAction = null
        
        const gltf = this.experience.resources.items.enemyModel
        const animations = gltf.animations || []
        
        if (animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.model)
            
            animations.forEach((clip) => {
                const name = clip.name.toLowerCase()
                
                if (name.includes('idle')) {
                    this.actions.idle = this.mixer.clipAction(clip)
                }
                // Priorizar Walk2 sobre Walk normal
                else if (name.includes('walk2')) {
                    this.actions.walk = this.mixer.clipAction(clip)
                }
                else if (name.includes('walk') && !this.actions.walk) {
                    this.actions.walk = this.mixer.clipAction(clip)
                }
                else if (name.includes('attack') || name.includes('bite')) {
                    this.actions.attack = this.mixer.clipAction(clip)
                }
                else if (name.includes('scream')) {
                    this.actions.scream = this.mixer.clipAction(clip)
                }
            })
            
            // Fallback
            if (!this.actions.idle && animations[0]) {
                this.actions.idle = this.mixer.clipAction(animations[0])
            }
            if (!this.actions.walk && this.actions.idle) {
                this.actions.walk = this.actions.idle
            }
            
            // Iniciar en idle
            if (this.actions.idle) {
                this.actions.idle.play()
                this.currentAction = this.actions.idle
            }
            
            console.log('✅ Enemigo animaciones:', Object.keys(this.actions))
        }

        // ⚙️ Física
        const enemyMaterial = new CANNON.Material('enemyMaterial')
        enemyMaterial.friction = 0.0

        const shape = new CANNON.Sphere(0.5)
        this.body = new CANNON.Body({
            mass: 5,
            shape,
            material: enemyMaterial,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            linearDamping: 0.01
        })

        if (this.playerRef?.body) {
            this.body.position.y = this.playerRef.body.position.y
            this.model.position.y = this.body.position.y
        }

        this.body.sleepSpeedLimit = 0.0
        this.body.wakeUp()
        this.physicsWorld.addBody(this.body)
        this.model.userData.physicsBody = this.body

        // 💥 Colisión con jugador
        this._onCollide = (event) => {
            if (event.body === this.playerRef.body) {
                if (typeof this.playerRef.die === 'function') {
                    this.playerRef.die()
                }

                if (this.proximitySound) {
                    this.proximitySound.stop()
                }

                if (this.model.parent) {
                    new FinalPrizeParticles({
                        scene: this.scene,
                        targetPosition: this.body.position,
                        sourcePosition: this.body.position,
                        experience: this.experience
                    })
                    this.destroy()
                }
            }
        }

        this.body.addEventListener('collide', this._onCollide)
    }

    // 🎯 Generar punto de patrullaje random cerca de la posición actual
    _generateNewPatrolPoint(currentPos) {
        const angle = Math.random() * Math.PI * 2
        const distance = 5 + Math.random() * 10 // 5-15 metros
        
        this.patrolPoint.set(
            currentPos.x + Math.cos(angle) * distance,
            currentPos.y,
            currentPos.z + Math.sin(angle) * distance
        )
    }

    // 👁️ Verificar si el jugador está en campo de visión
    _canSeePlayer() {
        if (!this.playerRef?.body) return false

        const enemyPos = this.body.position
        const playerPos = this.playerRef.body.position

        // Distancia
        const distance = enemyPos.distanceTo(playerPos)
        if (distance > this.detectionRange) return false

        // Dirección hacia el jugador
        const toPlayer = new THREE.Vector3(
            playerPos.x - enemyPos.x,
            0,
            playerPos.z - enemyPos.z
        ).normalize()

        // Dirección hacia donde mira el enemigo
        const forward = new THREE.Vector3(0, 0, 1)
        forward.applyQuaternion(this.model.quaternion)
        forward.y = 0
        forward.normalize()

        // Ángulo entre ambas direcciones
        const angle = forward.angleTo(toPlayer)

        // ✅ Verificar que no haya paredes entre el zombie y el jugador
        if (angle < this.fieldOfView / 2) {
            const enemyPos3 = new THREE.Vector3(enemyPos.x, enemyPos.y + 1, enemyPos.z)
            const playerPos3 = new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z)
            
            this.raycaster.set(enemyPos3, toPlayer)
            const intersects = this.raycaster.intersectObjects(this.scene.children, true)
            
            // Filtrar solo objetos que sean paredes/obstáculos
            const wallHit = intersects.find(hit => {
                return hit.distance < distance && 
                       hit.object.userData?.levelObject === true
            })
            
            return !wallHit // Solo puede ver si no hay pared en medio
        }

        return false
    }

    // 🧱 Detectar paredes adelante usando raycast
    _detectWallAhead() {
        const forward = new THREE.Vector3(0, 0, 1)
        forward.applyQuaternion(this.model.quaternion)
        forward.y = 0
        forward.normalize()

        const enemyPos = new THREE.Vector3(
            this.body.position.x, 
            this.body.position.y + 0.5, 
            this.body.position.z
        )

        this.raycaster.set(enemyPos, forward)
        const intersects = this.raycaster.intersectObjects(this.scene.children, true)

        const wallHit = intersects.find(hit => 
            hit.distance < this.wallDetectionDistance && 
            hit.object.userData?.levelObject === true
        )

        return wallHit || null
    }

    // 🔄 Calcular dirección de evasión cuando detecta pared
    _calculateAvoidanceDirection(wallNormal) {
        // Rotar 90 grados a la derecha del normal de la pared
        const avoidDir = new THREE.Vector3(-wallNormal.z, 0, wallNormal.x)
        return avoidDir.normalize()
    }

    // 🐛 Detectar si está atascado (sin moverse)
    _checkIfStuck(delta, currentPos) {
        const moved = currentPos.distanceTo(this.lastPosition)
        
        if (moved < 0.1) { // casi no se movió
            this.stuckTimer += delta
        } else {
            this.stuckTimer = 0
        }

        this.lastPosition.copy(currentPos)

        return this.stuckTimer > this.stuckThreshold
    }

    // 🎬 Cambiar animación suavemente
    _playAction(name, fadeDuration = 0.25) {
        if (!this.mixer || !this.actions[name]) return
        
        const newAction = this.actions[name]
        if (this.currentAction === newAction) return
        
        newAction.reset().play()
        
        if (this.currentAction) {
            this.currentAction.crossFadeTo(newAction, fadeDuration, true)
        }
        
        this.currentAction = newAction
    }

    update(delta) {
        // ⏱️ Delay inicial
        if (this.delayActivation > 0) {
            this.delayActivation -= delta
            return
        }

        if (!this.body || !this.playerRef?.body) return

        // 🎬 Actualizar animaciones
        if (this.mixer) {
            this.mixer.update(delta)
        }

        const enemyPos = this.body.position
        const playerPos = this.playerRef.body.position
        const distanceToPlayer = enemyPos.distanceTo(playerPos)

        // 🧠 Máquina de estados
        switch (this.state) {
            case 'patrol':
                this._updatePatrol(delta, enemyPos, playerPos, distanceToPlayer)
                break
            case 'chase':
                this._updateChase(delta, enemyPos, playerPos, distanceToPlayer)
                break
            case 'attack':
                this._updateAttack(delta, enemyPos, playerPos, distanceToPlayer)
                break
        }

        // 🔊 Volumen según cercanía
        const maxDistance = 10
        const clampedDistance = Math.min(distanceToPlayer, maxDistance)
        const proximityVolume = 1 - (clampedDistance / maxDistance)
        if (this.proximitySound) {
            this.proximitySound.setVolume(proximityVolume * 0.8)
        }

        // 🔄 Sincronizar visual con física
        this.model.position.copy(this.body.position)
    }

    _updatePatrol(delta, enemyPos, playerPos, distance) {
        // 👁️ Verificar si ve al jugador
        if (this._canSeePlayer()) {
            this.state = 'chase'
            this._playAction('scream') // grito de detección
            setTimeout(() => {
                if (this.state === 'chase') {
                    this._playAction('walk')
                }
            }, 1000)
            return
        }

        // 🧱 Detectar si está atascado
        if (this._checkIfStuck(delta, enemyPos)) {
            console.log('🐛 Zombie atascado, generando nuevo punto de patrullaje')
            this.stuckTimer = 0
            this._generateNewPatrolPoint(enemyPos)
        }

        // 🚧 Detectar paredes adelante
        const wall = this._detectWallAhead()
        
        if (wall && this.avoidanceTimer <= 0) {
            // Hay pared: calcular dirección de evasión
            this.avoidanceDirection = this._calculateAvoidanceDirection(wall.face.normal)
            this.avoidanceTimer = 1.5 // esquivar por 1.5 segundos
            console.log('🧱 Pared detectada, esquivando...')
        }

        let moveDirection = new THREE.Vector3()

        if (this.avoidanceTimer > 0) {
            // 🔄 Modo evasión: moverse en dirección perpendicular a la pared
            this.avoidanceTimer -= delta
            moveDirection.copy(this.avoidanceDirection)
            this.speed = this.baseSpeed * 0.7
        } else {
            // 🚶 Moverse al punto de patrullaje
            const toPatrol = new THREE.Vector3(
                this.patrolPoint.x - enemyPos.x,
                0,
                this.patrolPoint.z - enemyPos.z
            )

            const distanceToPatrol = toPatrol.length()

            if (distanceToPatrol < 1.5) {
                // Llegó al punto: esperar
                this.speed = 0
                this._playAction('idle')
                
                this.patrolTimer += delta
                if (this.patrolTimer > this.patrolWaitTime) {
                    this.patrolTimer = 0
                    this._generateNewPatrolPoint(enemyPos)
                }
                return
            } else {
                // Ir hacia el punto
                this.speed = this.baseSpeed * 0.5
                moveDirection.copy(toPatrol).normalize()
            }
        }

        // 🏃 Aplicar movimiento
        this._playAction('walk')
        this.body.velocity.x = moveDirection.x * this.speed
        this.body.velocity.z = moveDirection.z * this.speed

        // 🔄 Rotar suavemente hacia la dirección de movimiento
        if (moveDirection.lengthSq() > 0.01) {
            const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
            const currentRotation = this.model.rotation.y
            
            // Interpolación suave de rotación
            let diff = targetRotation - currentRotation
            // Normalizar diferencia de ángulo
            while (diff > Math.PI) diff -= Math.PI * 2
            while (diff < -Math.PI) diff += Math.PI * 2
            
            this.model.rotation.y += diff * delta * 3 // suavidad
        }
    }

    _updateChase(delta, enemyPos, playerPos, distance) {
        // 🏃 Perseguir al jugador
        
        // Verificar si perdió de vista al jugador
        if (!this._canSeePlayer() && distance > this.loseInterestDistance) {
            this.state = 'patrol'
            this._generateNewPatrolPoint(enemyPos)
            this._playAction('idle')
            console.log('👻 Zombie perdió de vista al jugador')
            return
        }

        // Si está muy cerca: atacar
        if (distance < 1.5) {
            this.state = 'attack'
            return
        }

        // 🧱 Detectar si está atascado persiguiendo
        if (this._checkIfStuck(delta, enemyPos)) {
            console.log('🐛 Zombie atascado persiguiendo, esquivando...')
            this.stuckTimer = 0
            // Moverse a un lado para desatascarse
            const right = new THREE.Vector3(1, 0, 0)
            right.applyQuaternion(this.model.quaternion)
            this.body.velocity.x += right.x * 3
            this.body.velocity.z += right.z * 3
        }

        // 🚧 Detectar paredes al perseguir
        const wall = this._detectWallAhead()
        
        let moveDirection = new THREE.Vector3(
            playerPos.x - enemyPos.x,
            0,
            playerPos.z - enemyPos.z
        )

        if (wall && this.avoidanceTimer <= 0) {
            // Hay pared: esquivar mientras persigue
            const wallNormal = wall.face.normal.clone()
            
            // Combinar evasión con dirección al jugador
            const avoidDir = this._calculateAvoidanceDirection(wallNormal)
            const toPlayer = moveDirection.clone().normalize()
            
            // Mezclar 70% evasión + 30% hacia jugador
            moveDirection.copy(avoidDir).multiplyScalar(0.7)
            moveDirection.add(toPlayer.multiplyScalar(0.3))
            
            this.avoidanceTimer = 0.8 // esquivar brevemente
        } else if (this.avoidanceTimer > 0) {
            this.avoidanceTimer -= delta
        }

        // 🏃 Perseguir
        this.speed = this.baseSpeed * 2.0 // correr
        this._playAction('walk')

        if (moveDirection.length() > 0.5) {
            moveDirection.normalize()
            this.body.velocity.x = moveDirection.x * this.speed
            this.body.velocity.z = moveDirection.z * this.speed
        }

        // 🔄 Rotar suavemente hacia el jugador
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z)
        const currentRotation = this.model.rotation.y
        
        let diff = targetRotation - currentRotation
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        
        this.model.rotation.y += diff * delta * 5 // rotación más rápida al perseguir
    }

    _updateAttack(delta, enemyPos, playerPos, distance) {
        // ⚔️ Atacar
        
        if (distance > 2.5) {
            // Muy lejos: volver a perseguir
            this.state = 'chase'
            return
        }

        this.speed = 0.3 // moverse muy lento al atacar
        this._playAction('attack')

        // Seguir mirando al jugador
        const toPlayer = new THREE.Vector3(
            playerPos.x - enemyPos.x,
            0,
            playerPos.z - enemyPos.z
        )

        if (toPlayer.lengthSq() > 0.0001) {
            toPlayer.normalize()
            const targetRotation = Math.atan2(toPlayer.x, toPlayer.z)
            this.model.rotation.y = targetRotation
            
            // Moverse un poco hacia el jugador
            this.body.velocity.x = toPlayer.x * this.speed
            this.body.velocity.z = toPlayer.z * this.speed
        }
    }

    destroy() {
        if (this.model) {
            this.scene.remove(this.model)
            
            this.model.traverse((child) => {
                if (child.geometry) child.geometry.dispose()
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose())
                    } else {
                        child.material.dispose()
                    }
                }
            })
        }

        if (this.proximitySound) {
            this.proximitySound.stop()
        }

        if (this.mixer) {
            this.mixer.stopAllAction()
            this.mixer = null
        }

        if (this.body) {
            this.body.removeEventListener('collide', this._onCollide)

            if (this.physicsWorld.bodies.includes(this.body)) {
                this.physicsWorld.removeBody(this.body)
            }

            this.body = null
        }
    }
}