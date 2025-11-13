// Experience/Utils/KeyboardControls.js
import EventEmitter from './EventEmitter.js'

export default class KeyboardControls extends EventEmitter {
    constructor() {
        super()

        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false,
            e: false // ✨ NUEVA TECLA PARA ENTRAR AL PORTAL
        }

        this.setListeners()
    }

    setListeners() {
        window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp' || event.code === 'KeyW') this.keys.up = true
            if (event.key === 'ArrowDown' || event.code === 'KeyS') this.keys.down = true
            if (event.key === 'ArrowLeft' || event.code === 'KeyA') this.keys.left = true
            if (event.key === 'ArrowRight' || event.code === 'KeyD') this.keys.right = true
            if (event.code === 'Space') this.keys.space = true
            if (event.code === 'KeyE') this.keys.e = true // ✨ NUEVA
            this.trigger('change', this.keys)
        })

        window.addEventListener('keyup', (event) => {
            if (event.key === 'ArrowUp' || event.code === 'KeyW') this.keys.up = false
            if (event.key === 'ArrowDown' || event.code === 'KeyS') this.keys.down = false
            if (event.key === 'ArrowLeft' || event.code === 'KeyA') this.keys.left = false
            if (event.key === 'ArrowRight' || event.code === 'KeyD') this.keys.right = false
            if (event.code === 'Space') this.keys.space = false
            if (event.code === 'KeyE') this.keys.e = false // ✨ NUEVA
            this.trigger('change', this.keys)
        })
    }

    getState() {
        return this.keys
    }
}
