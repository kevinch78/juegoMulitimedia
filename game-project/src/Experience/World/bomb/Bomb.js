import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default class Bomb {
    constructor({ scene, physicsWorld, position, experience, onExplode }) {
        this.scene = scene
        this.physicsWorld = physicsWorld
        this.position = position
        this.experience = experience
        this.onExplode = onExplode // Callback cuando explota
        
        this.hasExploded = false
        this.isActive = true
        
        // Sonido de explosión
        this.explosionSound = null
        
        this.createBombModel()
        this.createPhysics()
        this.createWarningEffect()
        
        console.log('💣 Bomba creada en:', position)
    }

    createBombModel() {
        // Grupo contenedor
        this.group = new THREE.Group()
        
        // 💣 Cuerpo de la bomba (esfera negra)
        const bombGeometry = new THREE.SphereGeometry(0.6, 16, 16)
        const bombMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.8,
            roughness: 0.3
        })
        this.bombMesh = new THREE.Mesh(bombGeometry, bombMaterial)
        this.bombMesh.castShadow = true
        this.bombMesh.receiveShadow = true
        
        // 🔥 Mecha de la bomba (cilindro)
        const fuseGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8)
        const fuseMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9
        })
        this.fuseMesh = new THREE.Mesh(fuseGeometry, fuseMaterial)
        this.fuseMesh.position.y = 0.8
        
        // ✨ Chispa en la punta de la mecha
        const sparkGeometry = new THREE.SphereGeometry(0.12, 8, 8)
        const sparkMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            emissive: 0xff4400,
            emissiveIntensity: 2
        })
        this.sparkMesh = new THREE.Mesh(sparkGeometry, sparkMaterial)
        this.sparkMesh.position.y = 1.0
        
        // 💡 Luz parpadeante
        this.sparkLight = new THREE.PointLight(0xff4400, 2, 5)
        this.sparkLight.position.copy(this.sparkMesh.position)
        
        // Ensamblar todo
        this.group.add(this.bombMesh)
        this.group.add(this.fuseMesh)
        this.group.add(this.sparkMesh)
        this.group.add(this.sparkLight)
        
        this.group.position.copy(this.position)
        this.scene.add(this.group)
        
        // Animación de la chispa
        this.sparkTime = 0
    }

    createPhysics() {
        // Sensor de colisión (sin masa para que no se mueva)
        const shape = new CANNON.Sphere(1.2) // Radio de detección más grande
        this.body = new CANNON.Body({
            mass: 0,
            shape: shape,
            isTrigger: true, // Actúa como trigger
            position: new CANNON.Vec3(this.position.x, this.position.y, this.position.z)
        })
        
        this.physicsWorld.addBody(this.body)
    }

    createWarningEffect() {
        // ⚠️ Anillo de advertencia en el suelo
        const ringGeometry = new THREE.RingGeometry(1.0, 1.3, 32)
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        })
        this.warningRing = new THREE.Mesh(ringGeometry, ringMaterial)
        this.warningRing.rotation.x = -Math.PI / 2
        this.warningRing.position.copy(this.position)
        this.warningRing.position.y = 0.05
        this.scene.add(this.warningRing)
        
        this.warningTime = 0
    }

    update(delta) {
        if (!this.isActive || this.hasExploded) return
        
        // Animación de chispa parpadeante
        this.sparkTime += delta * 8
        const sparkIntensity = Math.sin(this.sparkTime) * 0.5 + 1.5
        this.sparkLight.intensity = sparkIntensity
        this.sparkMesh.scale.setScalar(0.8 + Math.sin(this.sparkTime) * 0.3)
        
        // Animación del anillo de advertencia
        this.warningTime += delta * 2
        this.warningRing.scale.setScalar(1 + Math.sin(this.warningTime) * 0.1)
        this.warningRing.material.opacity = 0.3 + Math.sin(this.warningTime * 2) * 0.2
        
        // Rotación suave de la bomba
        this.bombMesh.rotation.y += delta * 0.5
    }

    checkCollision(playerPosition) {
        if (this.hasExploded || !this.isActive) return false
        
        const distance = this.position.distanceTo(playerPosition)
        
        if (distance < 1.2) {
            this.explode()
            return true
        }
        
        return false
    }

    explode() {
        if (this.hasExploded) return
        
        this.hasExploded = true
        console.log('💥 ¡BOMBA EXPLOTANDO!')
        
        // Reproducir sonido si está disponible
        if (window.userInteracted) {
            this.playExplosionSound()
        }
        
        // Crear partículas de explosión
        this.createExplosionParticles()
        
        // Animación de escala (la bomba "explota")
        this.animateExplosion()
        
        // Llamar al callback
        if (this.onExplode) {
            this.onExplode(this)
        }
        
        // Destruir después de la animación
        setTimeout(() => {
            this.destroy()
        }, 1500)
    }

    createExplosionParticles() {
        const particleCount = 50
        const particles = []
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1, 4, 4)
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random() * 0.1, 1, 0.5), // Naranjas y rojos
                transparent: true,
                opacity: 1
            })
            
            const particle = new THREE.Mesh(geometry, material)
            particle.position.copy(this.position)
            
            // Velocidad aleatoria en todas direcciones
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                Math.random() * 8 + 2,
                (Math.random() - 0.5) * 10
            )
            
            particle.life = 1.0
            particle.gravity = -15
            
            this.scene.add(particle)
            particles.push(particle)
        }
        
        // Animar partículas
        const animateParticles = () => {
            let allDead = true
            
            particles.forEach(particle => {
                if (particle.life > 0) {
                    allDead = false
                    
                    particle.life -= 0.02
                    particle.velocity.y += particle.gravity * 0.016
                    
                    particle.position.add(particle.velocity.clone().multiplyScalar(0.016))
                    particle.material.opacity = particle.life
                    
                    if (particle.life <= 0) {
                        this.scene.remove(particle)
                        particle.geometry.dispose()
                        particle.material.dispose()
                    }
                }
            })
            
            if (!allDead) {
                requestAnimationFrame(animateParticles)
            }
        }
        
        animateParticles()
        
        // 🔥 Flash de luz
        const explosionLight = new THREE.PointLight(0xff4400, 10, 20)
        explosionLight.position.copy(this.position)
        this.scene.add(explosionLight)
        
        let lightIntensity = 10
        const fadeLight = () => {
            lightIntensity -= 0.3
            explosionLight.intensity = Math.max(0, lightIntensity)
            
            if (lightIntensity > 0) {
                requestAnimationFrame(fadeLight)
            } else {
                this.scene.remove(explosionLight)
            }
        }
        fadeLight()
    }

    animateExplosion() {
        const startScale = 1
        const maxScale = 3
        const duration = 500 // ms
        const startTime = Date.now()
        
        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            
            // Escala exponencial
            const scale = startScale + (maxScale - startScale) * progress
            this.group.scale.setScalar(scale)
            
            // Fade out
            this.group.traverse((child) => {
                if (child.material) {
                    child.material.transparent = true
                    child.material.opacity = 1 - progress
                }
            })
            
            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }
        
        animate()
    }

    playExplosionSound() {
        // Si tienes un sistema de sonido en tu experience
        if (this.experience?.resources?.items?.explosionSound) {
            const sound = this.experience.resources.items.explosionSound
            sound.play()
        } else {
            // Crear sonido básico con Web Audio API
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)()
                const oscillator = audioContext.createOscillator()
                const gainNode = audioContext.createGain()
                
                oscillator.connect(gainNode)
                gainNode.connect(audioContext.destination)
                
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
                oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5)
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
                
                oscillator.start(audioContext.currentTime)
                oscillator.stop(audioContext.currentTime + 0.5)
            } catch (e) {
                console.warn('No se pudo reproducir sonido de explosión:', e)
            }
        }
    }

    destroy() {
        console.log('🗑️ Destruyendo bomba...')
        
        this.isActive = false
        
        // Limpiar objetos 3D
        this.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose()
            if (child.material) child.material.dispose()
        })
        
        this.scene.remove(this.group)
        this.scene.remove(this.warningRing)
        
        this.warningRing.geometry.dispose()
        this.warningRing.material.dispose()
        
        // Limpiar física
        if (this.body && this.physicsWorld) {
            this.physicsWorld.removeBody(this.body)
        }
    }
}