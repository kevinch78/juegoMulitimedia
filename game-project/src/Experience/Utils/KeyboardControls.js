export default class KeyboardControls {
    constructor() {
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false,
            shift: false,  // ✨ NUEVO: Para correr
            e: false,      // ✨ Para entrar al portal
            
            // ✨ NUEVO: Teclas para animaciones especiales
            '1': false,    // Wave
            '2': false,    // Yes
            '3': false,    // No
            '4': false,    // Punch
            '5': false,    // Duck
            '6': false     // Extra
        }

        this._onKeyDown = this._onKeyDown.bind(this)
        this._onKeyUp = this._onKeyUp.bind(this)

        window.addEventListener('keydown', this._onKeyDown)
        window.addEventListener('keyup', this._onKeyUp)
    }

    _onKeyDown(event) {
        switch(event.code) {
            // Movimiento
            case 'KeyW':
            case 'ArrowUp':
                this.keys.up = true
                break
            case 'KeyS':
            case 'ArrowDown':
                this.keys.down = true
                break
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true
                break
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true
                break
            
            // Acciones
            case 'Space':
                this.keys.space = true
                break
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.shift = true
                break
            case 'KeyE':
                this.keys.e = true
                break
            
            // Animaciones especiales
            case 'Digit1':
                this.keys['1'] = true
                break
            case 'Digit2':
                this.keys['2'] = true
                break
            case 'Digit3':
                this.keys['3'] = true
                break
            case 'Digit4':
                this.keys['4'] = true
                break
            case 'Digit5':
                this.keys['5'] = true
                break
            case 'Digit6':
                this.keys['6'] = true
                break
        }
    }

    _onKeyUp(event) {
        switch(event.code) {
            // Movimiento
            case 'KeyW':
            case 'ArrowUp':
                this.keys.up = false
                break
            case 'KeyS':
            case 'ArrowDown':
                this.keys.down = false
                break
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false
                break
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false
                break
            
            // Acciones
            case 'Space':
                this.keys.space = false
                break
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.shift = false
                break
            case 'KeyE':
                this.keys.e = false
                break
            
            // Animaciones especiales
            case 'Digit1':
                this.keys['1'] = false
                break
            case 'Digit2':
                this.keys['2'] = false
                break
            case 'Digit3':
                this.keys['3'] = false
                break
            case 'Digit4':
                this.keys['4'] = false
                break
            case 'Digit5':
                this.keys['5'] = false
                break
            case 'Digit6':
                this.keys['6'] = false
                break
        }
    }

    getState() {
        return this.keys
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown)
        window.removeEventListener('keyup', this._onKeyUp)
    }
}