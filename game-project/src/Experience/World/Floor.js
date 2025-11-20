import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export default class Floor {
    constructor(experience, level = 1) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics
        this.level = level // Nivel actual

        this.setGeometry()
        this.setTextures()
        this.setMaterial()
        this.setMesh()
        this.setPhysics()
    }

    setGeometry() {
        this.size = { width: 95, height: 2, depth: 110 }
        this.geometry = new THREE.BoxGeometry(
            this.size.width,
            this.size.height,
            this.size.depth
        )
    }

    setTextures() {
        this.textures = {}

        if (this.level === 1) {
            // 🛣️ NIVEL 1 → Textura de asfalto
            this.textures.color = this.resources.items.asfaltoColor
            this.textures.color.colorSpace = THREE.SRGBColorSpace
            this.textures.color.wrapS = THREE.RepeatWrapping
            this.textures.color.wrapT = THREE.RepeatWrapping
            this.textures.color.repeat.set(30, 30)

            // Displacement para relieve
            this.textures.height = this.resources.items.asfaltoHeight
            this.textures.height.wrapS = THREE.RepeatWrapping
            this.textures.height.wrapT = THREE.RepeatWrapping
            this.textures.height.repeat.set(30, 30)

        } else if (this.level === 2) {
            // 🏜️ NIVEL 2 → Textura del desierto
            this.textures.color = this.resources.items.desertColor
            this.textures.color.colorSpace = THREE.SRGBColorSpace
            this.textures.color.wrapS = THREE.RepeatWrapping
            this.textures.color.wrapT = THREE.RepeatWrapping
            this.textures.color.repeat.set(30, 30)

            // Displacement para arena
            this.textures.height = this.resources.items.desertHeight
            this.textures.height.wrapS = THREE.RepeatWrapping
            this.textures.height.wrapT = THREE.RepeatWrapping
            this.textures.height.repeat.set(30, 30)

        } else if (this.level === 3) {
            // 🌊 NIVEL 3 → Textura oceánica
            this.textures.color = this.resources.items.ocean1
            this.textures.color.colorSpace = THREE.SRGBColorSpace
            this.textures.color.wrapS = THREE.RepeatWrapping
            this.textures.color.wrapT = THREE.RepeatWrapping
            this.textures.color.repeat.set(50, 50)

            this.textures.normal = this.resources.items.ocean3
            this.textures.normal.wrapS = THREE.RepeatWrapping
            this.textures.normal.wrapT = THREE.RepeatWrapping
            this.textures.normal.repeat.set(50, 50)
        }
    }

    setMaterial() {
        if (this.level === 1) {
            // 🛣️ Material asfalto con displacement
            this.material = new THREE.MeshStandardMaterial({
                map: this.textures.color,
                displacementMap: this.textures.height,
                displacementScale: 0.1, // Ajusta el relieve
                roughness: 0.9,         // Asfalto no refleja mucho
                metalness: 0.1
            })
        } else if (this.level === 2) {
            // 🏜️ Material desierto con displacement
            this.material = new THREE.MeshStandardMaterial({
                map: this.textures.color,
                displacementMap: this.textures.height,
                displacementScale: 0.15, // Arena con más relieve
                roughness: 0.95,         // Arena muy mate
                metalness: 0.0
            })
        } else if (this.level === 3) {
            // 🌊 Material oceánico con normal map
            this.material = new THREE.MeshStandardMaterial({
                map: this.textures.color,
                normalMap: this.textures.normal,
                normalScale: new THREE.Vector2(0.5, 0.5), // Intensidad del relieve visual
                roughness: 0.3,          // Agua más reflectante
                metalness: 0.2
            })
        }
    }

    setMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.position.set(0, -this.size.height / 2, 0)
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    setPhysics() {
        const shape = new CANNON.Box(new CANNON.Vec3(
            this.size.width / 2,
            this.size.height / 2,
            this.size.depth / 2
        ))

        this.body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(0, -this.size.height / 2, 0)
        })

        this.physics.world.addBody(this.body)
    }

    // 🔄 Método para cambiar el nivel dinámicamente
    updateLevel(newLevel) {
        this.level = newLevel
        
        // Limpiar texturas anteriores
        if (this.material.map) this.material.map.dispose()
        if (this.material.displacementMap) this.material.displacementMap.dispose()
        if (this.material.normalMap) this.material.normalMap.dispose()
        this.material.dispose()
        
        // Reconfigurar con el nuevo nivel
        this.setTextures()
        this.setMaterial()
        this.mesh.material = this.material
        
        console.log(`🎨 Piso actualizado al nivel ${newLevel}`)
    }

    destroy() {
        // Limpiar recursos
        this.geometry.dispose()
        if (this.material.map) this.material.map.dispose()
        if (this.material.displacementMap) this.material.displacementMap.dispose()
        if (this.material.normalMap) this.material.normalMap.dispose()
        this.material.dispose()
        
        this.scene.remove(this.mesh)
        this.physics.world.removeBody(this.body)
    }
}