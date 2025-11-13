import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'

export default class Personaje {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0

        // 🎮 Estado del personaje
        this.isDead = false
        this.isJumping = false

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()

        console.log('✨ Personaje creado correctamente')
    }

    setModel() {
        // 🎨 Intentar cargar personajeModel, si no existe usar robotModel
        const modelResource = this.resources.items.PersonajeModel || this.resources.items.robotModel
        
        if (!modelResource) {
            console.error('❌ No se encontró ningún modelo para el personaje')
            return
        }

        this.model = modelResource.scene
        
        console.log('✅ Usando modelo:', 
            this.resources.items.PersonajeModel ? 'PersonajeModel ✨' : 'robotModel (temporal)'
        )
        
        // 📏 Ajustar escala
        this.model.scale.set(0.6, 0.6, 0.6)
        this.model.position.set(0, -0.2, 0)

        // 📦 Crear grupo para mejor control
        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        // 🌟 Configurar sombras
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
                child.receiveShadow = true
            }
        })

        console.log('🎨 Modelo del personaje cargado')
    }

    setPhysics() {
        // 🔵 Forma física (esfera para mejor movimiento)
        const shape = new CANNON.Sphere(0.4)

        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            position: new CANNON.Vec3(0, 1.2, 0),
            linearDamping: 0.05,
            angularDamping: 0.9
        })

        // 🔒 Bloquear rotación en X y Z
        this.body.angularFactor.set(0, 1, 0)

        // 💤 Estabilización inicial
        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.sleep()
        
        // 🎯 Material físico
        this.body.material = this.physics.robotMaterial

        this.physics.world.addBody(this.body)

        // ⏰ Activar después de inicializar
        setTimeout(() => {
            this.body.wakeUp()
        }, 100)

        console.log('⚙️ Física del personaje configurada')
    }

    setSounds() {
        // 🔊 Sonidos del personaje
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { 
            loop: true, 
            volume: 0.5 
        })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', { 
            volume: 0.8 
        })

        console.log('🔊 Sonidos del personaje cargados')
    }

    setAnimation() {
        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        // 🎬 Obtener animaciones del modelo
        const modelResource = this.resources.items.PersonajeModel || this.resources.items.robotModel
        
        if (!modelResource || !modelResource.animations) {
            console.error('❌ No se encontraron animaciones')
            return
        }

        const animations = modelResource.animations

        // 🎬 MOSTRAR TODAS LAS ANIMACIONES
        console.log('🎬 ========================================')
        console.log('🎬 ANIMACIONES DEL PERSONAJE:')
        console.log('🎬 ========================================')
        
        animations.forEach((clip, index) => {
            console.log(`🎬 [${index}] "${clip.name}" - ${clip.duration.toFixed(2)}s`)
        })
        
        console.log('🎬 ========================================')

        // 🗺️ MAPEO AUTOMÁTICO DE ANIMACIONES
        const animationMap = {
            // Básicas
            'idle': ['idle', 'reposo'],
            'walk': ['walk', 'caminata', 'caminar'],
            'run': ['run', 'correr', 'running'],
            'jump': ['jump', 'salto', 'saltar'],
            'death': ['death', 'die', 'muerte', 'morir'],
            
            // Extras del modelo Character
            'duck': ['duck', 'agacharse', 'crouch'],
            'hitReact': ['hitreact', 'hit', 'daño'],
            'punch': ['punch', 'puñetazo', 'golpe'],
            'wave': ['wave', 'saludar'],
            'yes': ['yes', 'si'],
            'no': ['no']
        }

        // 🔍 Función para buscar animaciones
        const findAnimation = (keywords) => {
            return animations.find(clip => 
                keywords.some(k => clip.name.toLowerCase().includes(k.toLowerCase()))
            )
        }

        // 🎯 Crear acciones para cada animación
        Object.entries(animationMap).forEach(([key, keywords]) => {
            const clip = findAnimation(keywords)
            if (clip) {
                this.animation.actions[key] = this.animation.mixer.clipAction(clip)
                console.log(`✅ ${key.padEnd(12)} → ${clip.name}`)
            }
        })

        // ⚙️ Configurar animaciones especiales
        if (this.animation.actions.jump) {
            this.animation.actions.jump.setLoop(THREE.LoopOnce)
            this.animation.actions.jump.clampWhenFinished = true
            
            // Callback cuando termina el salto
            this.animation.mixer.addEventListener('finished', (e) => {
                if (e.action === this.animation.actions.jump) {
                    this.isJumping = false
                    this.animation.play('idle')
                }
            })
        }

        if (this.animation.actions.death) {
            this.animation.actions.death.setLoop(THREE.LoopOnce)
            this.animation.actions.death.clampWhenFinished = true
        }

        // ▶️ Reproducir animación inicial
        this.animation.actions.current = this.animation.actions.idle
        if (this.animation.actions.current) {
            this.animation.actions.current.play()
        }

        // 🎭 Método para cambiar animaciones suavemente
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            if (!newAction) {
                // console.warn(`⚠️ Animación "${name}" no encontrada`)
                return
            }

            if (newAction === oldAction) return

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 0.3)
            this.animation.actions.current = newAction

            // 🔊 Reproducir sonidos
            if (name === 'walk' || name === 'run') {
                this.walkSound.play()
            } else {
                this.walkSound.stop()
            }

            if (name === 'jump') {
                this.jumpSound.play()
            }
        }

        console.log('🎬 Sistema de animaciones inicializado')
    }

    update() {
        // 💀 Si está muerto, no procesar nada
        if (this.isDead) return

        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta)

        const keys = this.keyboard.getState()
        const moveForce = 80
        const turnSpeed = 2.5
        let isMoving = false

        // 🏎️ Limitar velocidad máxima
        const maxSpeed = 15
        this.body.velocity.x = Math.max(Math.min(this.body.velocity.x, maxSpeed), -maxSpeed)
        this.body.velocity.z = Math.max(Math.min(this.body.velocity.z, maxSpeed), -maxSpeed)

        // 🚀 Salto
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)
        
        if (keys.space && this.body.position.y <= 1.3 && !this.isJumping) {
            this.body.applyImpulse(new CANNON.Vec3(forward.x * 0.5, 3, forward.z * 0.5))
            this.animation.play('jump')
            this.isJumping = true
            return
        }

        // 🛡️ Protección anti-caída
        if (this.body.position.y > 10 || this.body.position.y < -5) {
            console.warn('⚠️ Personaje fuera del escenario. Reubicando...')
            this.body.position.set(0, 1.2, 0)
            this.body.velocity.set(0, 0, 0)
        }

        // 🎯 Controles especiales (números 1-6)
        if (keys['1'] && this.animation.actions.wave) {
            this.animation.play('wave')
            return
        }
        if (keys['2'] && this.animation.actions.yes) {
            this.animation.play('yes')
            return
        }
        if (keys['3'] && this.animation.actions.no) {
            this.animation.play('no')
            return
        }
        if (keys['4'] && this.animation.actions.punch) {
            this.animation.play('punch')
            return
        }
        if (keys['5'] && this.animation.actions.duck) {
            this.animation.play('duck')
            return
        }

        // ⬆️ Movimiento hacia adelante
        if (keys.up) {
            const forward = new THREE.Vector3(0, 0, 3)
            forward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(forward.x * moveForce, 0, forward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // ⬇️ Movimiento hacia atrás
        if (keys.down) {
            const backward = new THREE.Vector3(0, 0, -3)
            backward.applyQuaternion(this.group.quaternion)
            this.body.applyForce(
                new CANNON.Vec3(backward.x * moveForce, 0, backward.z * moveForce),
                this.body.position
            )
            isMoving = true
        }

        // ⬅️ Rotación izquierda
        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }

        // ➡️ Rotación derecha
        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }

        // 🎬 Cambiar animaciones según movimiento
        if (!this.isJumping) {
            if (isMoving) {
                // 🏃 Usar Run si Shift está presionado, sino Walk
                const animName = keys.shift && this.animation.actions.run ? 'run' : 'walk'
                if (this.animation.actions.current !== this.animation.actions[animName]) {
                    this.animation.play(animName)
                }
            } else {
                if (this.animation.actions.current !== this.animation.actions.idle) {
                    this.animation.play('idle')
                }
            }
        }

        // 🔄 Sincronizar física → visual
        this.group.position.copy(this.body.position)
    }

    // 💀 Método de muerte
    die() {
        if (this.isDead) return
        this.isDead = true

        console.log('💀 Personaje ha muerto')

        // 🎬 Animación de muerte
        if (this.animation.actions.death) {
            this.animation.actions.current.fadeOut(0.2)
            this.animation.actions.death.reset().fadeIn(0.2).play()
            this.animation.actions.current = this.animation.actions.death
        }

        this.walkSound.stop()

        // ⏸️ Desactivar física temporalmente
        if (this.body) {
            this.body.velocity.set(0, 0, 0)
            this.body.angularVelocity.set(0, 0, 0)
            this.body.sleep()
        }

        // 🎨 Efecto visual de muerte
        this.group.position.y -= 0.3
    }

    // 🔄 Método de reset/resurrección
    reset() {
        this.isDead = false
        this.isJumping = false

        console.log('✨ Personaje reseteado')

        // ⚙️ Reactivar física
        if (!this.body) {
            this.setPhysics()
        } else {
            this.body.wakeUp()
            this.body.position.set(0, 1.2, 0)
            this.body.velocity.set(0, 0, 0)
            this.body.angularVelocity.set(0, 0, 0)
        }

        // 🎬 Resetear animaciones
        if (this.animation.actions.current) {
            this.animation.actions.current.stop()
        }
        
        this.animation.actions.idle.reset().play()
        this.animation.actions.current = this.animation.actions.idle

        // 📍 Resetear posición y rotación
        this.group.position.set(0, 1.2, 0)
        this.group.rotation.set(0, 0, 0)
        
        if (this.body) {
            this.body.quaternion.setFromEuler(0, 0, 0)
        }

        // 🔊 Detener sonidos
        this.walkSound.stop()
    }

    // 🎮 Método para probar animaciones manualmente
    testAnimation(animationName) {
        console.log(`🧪 Probando animación: ${animationName}`)
        this.animation.play(animationName)
    }

    // 📋 Método para listar animaciones disponibles
    listAnimations() {
        console.log('📋 ========================================')
        console.log('📋 ANIMACIONES DISPONIBLES:')
        console.log('📋 ========================================')
        Object.keys(this.animation.actions).forEach(key => {
            if (key !== 'current') {
                const action = this.animation.actions[key]
                const clip = action.getClip()
                console.log(`  ${key.padEnd(15)} - ${clip.name}`)
            }
        })
        console.log('📋 ========================================')
        console.log('💡 Usa: window.experience.world.personaje.testAnimation("nombre")')
        console.log('📋 ========================================')
    }
}