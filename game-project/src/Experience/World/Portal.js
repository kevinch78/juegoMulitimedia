import * as THREE from 'three'
import { ShaderMaterial } from 'three'
import portalVertexShader from '../shaders/portal/vertex.glsl.js'
import portalFragmentShader from '../shaders/portal/fragment.glsl.js'
import Sound from './Sound.js'
import FinalPrizeParticles from '../Utils/FinalPrizeParticles.js'

export default class Portal {
    constructor(experience, position) {
        this.experience = experience
        this.scene = this.experience.scene
        this.time = this.experience.time
        this.position = position // Position where the portal should appear
        this.resources = this.experience.resources

        // ✨ CARGAR LOS NUEVOS RECURSOS: el modelo del portal y su textura
        const portalGltf = this.resources.items.portalModel
        const bakedTexture = this.resources.items.portalTexture
        bakedTexture.flipY = false
        
        // Create the custom shader material
        this.portalMaterial = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorStart: { value: new THREE.Color(0.8, 0.05, 0.05) },   // red
                uColorEnd: { value: new THREE.Color(1.0, 0.4, 0.0) },       // orange
                uDistortionStrength: { value: 1.0 },
                uWaveFrequency: { value: 18.0 },
                uFogDensity: { value: 2.2 },
            },
            vertexShader: portalVertexShader,
            fragmentShader: portalFragmentShader,
            side: THREE.DoubleSide, // Important for portal effect
            transparent: true,
            depthWrite: false // Avoid issues with transparency
        })

        // Clone the scene from the GLTF to create an independent instance
        this.model = portalGltf.scene.clone()
        this.model.position.copy(this.position)

        // ✨ AJUSTES FINALES: Tamaño, posición y rotación
        this.model.scale.set(5, 5, 5); // Un poco más grande

        this.model.position.y -= 1.2; // Bajarlo para que no flote
        this.model.position.x -= 1; // Moverlo un poco a la derecha

        this.model.rotation.y = Math.PI; // Rotamos 180 grados para que "mire" hacia el centro


        // ✨ LÓGICA NUEVA: Aplicar materiales a las mallas correctas, como en el ejemplo del profesor
        const bakedMesh = this.model.getObjectByName('baked')
        const portalLightMesh = this.model.getObjectByName('portalLight')
        const poleLightAMesh = this.model.getObjectByName('poleLightA')
        const poleLightBMesh = this.model.getObjectByName('poleLightB')

        // Aplicar textura de piedra al arco
        if (bakedMesh) {
            bakedMesh.material = new THREE.MeshBasicMaterial({ map: bakedTexture })
        }

        // Aplicar shader al vórtice
        if (portalLightMesh) {
            portalLightMesh.material = this.portalMaterial
        }

        // Aplicar material de luz a los postes
        const poleLightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffe5 })
        if (poleLightAMesh) poleLightAMesh.material = poleLightMaterial
        if (poleLightBMesh) poleLightBMesh.material = poleLightMaterial

        // Si se encontró la malla para el shader, usar su posición para centrar luces/partículas
        let portalCenterPosition = this.position.clone(); // Posición de fallback
        if (portalLightMesh) {
            const worldPos = new THREE.Vector3();
            portalLightMesh.getWorldPosition(worldPos);
            portalCenterPosition.copy(worldPos);
        }

        // Asegurarse de que el resto del modelo (el arco de piedra) tenga su textura correcta
        this.model.traverse((child) => {
            if (child.isMesh) {
                // child.material.map.flipY = false; // Ya lo hicimos en la textura
                child.castShadow = true;
                child.receiveShadow = true;
            }
        })

        this.scene.add(this.model)

        // Add sound for the portal
        this.vortexSound = new Sound('/sounds/vortice.mp3', {
            loop: true,
            volume: 0.5
        })
        if (window.userInteracted) {
            this.vortexSound.play()
        }

        // Add particles and dynamic lights (discoRaysGroup) as part of the portal's visual activation
        this.discoRaysGroup = new THREE.Group()
        this.scene.add(this.discoRaysGroup)

        const rayMaterial = new THREE.MeshBasicMaterial({
            color: 0xaa00ff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        })

        const rayCount = 4
        for (let i = 0; i < rayCount; i++) {
            const cone = new THREE.ConeGeometry(0.2, 4, 6, 1, true)
            const ray = new THREE.Mesh(cone, rayMaterial)

            ray.position.set(0, 2, 0)
            ray.rotation.x = Math.PI / 2
            ray.rotation.z = (i * Math.PI * 2) / rayCount

            const spot = new THREE.SpotLight(0xaa00ff, 2, 12, Math.PI / 7, 0.2, 0.5)
            spot.castShadow = false
            spot.shadow.mapSize.set(1, 1)
            spot.position.copy(ray.position)
            spot.target.position.set(
                Math.cos(ray.rotation.z) * 10,
                2,
                Math.sin(ray.rotation.z) * 10
            )

            ray.userData.spot = spot
            this.discoRaysGroup.add(ray)
            this.discoRaysGroup.add(spot)
            this.discoRaysGroup.add(spot.target)
        }
        this.discoRaysGroup.position.copy(portalCenterPosition); // ✨ Usar la posición central del vórtice

        new FinalPrizeParticles({
            scene: this.scene,
            targetPosition: portalCenterPosition, // ✨ Usar la posición central del vórtice
            sourcePosition: this.experience.world.robot.body.position,
            experience: this.experience
        })

        console.log('✨ Portal activado en:', this.position)
    }

    update() {
        if (this.portalMaterial) {
            this.portalMaterial.uniforms.uTime.value = this.time.elapsed * 0.001
            const t = this.time.elapsed * 0.001
            const hue1 = (Math.sin(t * 0.5) + 1) * 0.5
            const hue2 = (Math.cos(t * 0.7) + 1) * 0.5
            this.portalMaterial.uniforms.uColorStart.value.setHSL(hue1, 0.8, 0.6)
            this.portalMaterial.uniforms.uColorEnd.value.setHSL(hue2, 0.9, 0.4)
            this.portalMaterial.uniforms.uDistortionStrength.value = 0.1 + Math.sin(t * 2) * 0.05
            this.portalMaterial.uniforms.uWaveFrequency.value = 8 + Math.sin(t) * 2
        }
        if (this.discoRaysGroup) {
            this.discoRaysGroup.rotation.y += this.time.delta * 0.001 * 0.5 // Rotate the disco rays
        }
    }

    destroy() {
        if (this.model) this.scene.remove(this.model)
        if (this.vortexSound) this.vortexSound.stop()
        if (this.portalMaterial) this.portalMaterial.dispose()
        if (this.discoRaysGroup) {
            this.discoRaysGroup.children.forEach(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
                if (obj.userData.spot) { // Dispose spot lights and their targets
                    this.scene.remove(obj.userData.spot);
                    this.scene.remove(obj.userData.spot.target);
                    obj.userData.spot.dispose();
                }
            });
            this.scene.remove(this.discoRaysGroup);
        }
        this.model = null
        this.portalMaterial = null
        this.vortexSound = null
        this.discoRaysGroup = null
    }
}