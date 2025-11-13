import * as THREE from 'three'

export default class Fox {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder('fox')
        }

        // ✨ Propiedades para el seguimiento
        this.target = null
        this.speed = 8 // Velocidad de movimiento del zorro
        this.stoppingDistance = 3 // Distancia a la que se detiene del jugador
        this.rotationSpeed = 2.0 // Velocidad de giro

        // Resource
        this.resource = this.resources.items.foxModel

        this.setModel()
        this.setAnimation()
    }

    setModel() {
        this.model = this.resource.scene
        this.model.scale.set(0.02, 0.02, 0.02)
        this.model.position.set(3, 0, 0)
        this.scene.add(this.model)
        //Activando la sobra de fox
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }
    //Manejo GUI
    setAnimation() {
        this.animation = {}

        // Mixer
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        // Actions
        this.animation.actions = {}

        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[2])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Play the action
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 1)

            this.animation.actions.current = newAction
        }

        // Debug
        if (this.debug.active) {
            const debugObject = {
                playIdle: () => { this.animation.play('idle') },
                playWalking: () => { this.animation.play('walking') },
                playRunning: () => { this.animation.play('running') }
            }
            this.debugFolder.add(debugObject, 'playIdle')
            this.debugFolder.add(debugObject, 'playWalking')
            this.debugFolder.add(debugObject, 'playRunning')
        }
    }

    // ✨ Método para establecer el objetivo a seguir
    setTarget(target) {
        this.target = target
    }

    update() {
        this.animation.mixer.update(this.time.delta * 0.001)

        // ✨ Lógica de seguimiento
        if (this.target && this.target.group) {
            const delta = this.time.delta * 0.001
            const foxPosition = this.model.position
            const targetPosition = this.target.group.position

            const distance = foxPosition.distanceTo(targetPosition)

            if (distance > this.stoppingDistance) {
                // Si está lejos, moverse hacia el objetivo
                const direction = new THREE.Vector3().subVectors(targetPosition, foxPosition).normalize()
                direction.y = 0 // Ignorar la altura para el movimiento y la rotación

                // Mover el zorro
                this.model.position.x += direction.x * this.speed * delta
                this.model.position.z += direction.z * this.speed * delta

                // Rotar suavemente para mirar al objetivo
                const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
                this.model.quaternion.slerp(targetQuaternion, this.rotationSpeed * delta)

                // Reproducir animación de caminar
                this.animation.play('walking')
            } else {
                // Si está cerca, detenerse y mirar
                this.animation.play('idle')
            }
        }
    }
}
