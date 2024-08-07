class Inputs {
    constructor() {
        this.leftHanded=window.avernKeyboardConfig==="left"
        this.leftHandedConfig = {
            forward: {
                code: "KeyI",
                name: "I",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },
            back: {
                code:"KeyK",
                name: "K",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,

            },
            left: {
                code:"KeyJ",
                name: "J",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,

            },
            right: {
                code:"KeyL",
                name: "L",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,

            },
        
            interact: {
                code: "Space",
                name: "Space",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            // jump: {
            //     code:"Space",
            //     name: "Space",
            //     pressed: false,

            //     onlyOnce: true,
            //     trackWasPressed: true,
            //     trackUp: false,
            // },
        
            pauseMenu: {
                code:"KeyM",
                name: "M",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            setTarget: {
                code:"KeyG",
                name: "G",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
            prevTarget: {
                code:"KeyV",
                name: "V",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
            clearTarget: {
                code:"ShiftLeft",
                name: "ShiftLeft",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
        
            action1: {
                code:"KeyF",
                name: "F",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            action2: {
                code:"KeyD",
                name: "D",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            action3: {
                code:"KeyS",
                name: "S",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            action4: {
                code:"KeyA",
                name: "A",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
        
            characterMenu: {
                code: "KeyC",
                name: "C",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
        
            flask: {
                code: "KeyE",
                name: "E",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },

            fruit: {
                code: "KeyR",
                name: "R",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
        
            turn: {
                code: "KeyO",
                name: ";",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },
            strafeLeft: {
                code: "KeyU",
                pressed: false,
                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },
            // strafeRight: {
            //     code: "KeyO",
            //     pressed: false,
            //     onlyOnce: false,
            //     trackWasPressed: true,
            //     trackUp: true,
            // },
            cameraUp: {
                code: "KeyP",
                pressed: false,
                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },
            cameraDown: {
                code: "Semicolon",
                pressed: false,
                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },
        }

        this.rightHandedConfig = {
            forward: {
                code: "KeyW",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },
            back: {
                code:"KeyS",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,

            },
            left: {
                code:"KeyA",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,

            },
            right: {
                code:"KeyD",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,

            },
        
            interact: {
                code:"Space",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            // jump: {
            //     code:"Space",
            //     name: "Space",
            //     pressed: false,

            //     onlyOnce: true,
            //     trackWasPressed: true,
            //     trackUp: false,
            // },
        
            pauseMenu: {
                code:"KeyC",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            setTarget: {
                code:"KeyH",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
            prevTarget: {
                code:"KeyN",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
            clearTarget: {
                code:"ShiftRight",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
        
            action1: {
                code:"KeyJ",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            action2: {
                code:"KeyK",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            action3: {
                code:"KeyL",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
            action4: {
                code:"Semicolon",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
        
            characterMenu: {
                code: "KeyM",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,
            },
        
            flask: {
                code: "KeyI",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },

            fruit: {
                code: "KeyU",
                pressed: false,

                onlyOnce: true,
                trackWasPressed: false,
                trackUp: false,

            },
        
            turn: {
                code: "KeyE",
                pressed: false,

                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },

            cameraUp: {
                code: "KeyR",
                pressed: false,
                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },

            cameraDown: {
                code: "KeyG",
                pressed: false,
                onlyOnce: false,
                trackWasPressed: true,
                trackUp: true,
            },

        }
        
        this.config = this.leftHandedConfig

        this.inputs = {
            primaryClick:false,
            secondaryClick: false,

            forward:false,
            back:false,
            left:false,
            right:false,

            forwardWasPressed:false,
            forwardWasLifted:false,

            backWasPressed:false,
            backWasLifted:false,

            leftWasPressed:false,
            leftWasLifted:false,

            strafeLeftWasPressed:false,
            strafeLeftWasLifted:false,

            rightWasPressed:false,
            rightWasLifted:false,

            strafeRightWasPressed:false,
            strafeRightWasLifted:false,

            interact:false,
            jump:false,

            characterMenu:false,
            setTarget:false,
            prevTarget:false,
            clearTarget:false,

            action1:false,
            action2:false,
            action3:false,
            action4:false,

            reset: false,
            flask: false,
            fruit: false,

            turn: false,
            turnWasPressed:false,
            turnWasLifted:false,

            // cameraUp: false,
            // cameraUpWasPressed:false,
            // cameraUpWasLifted:false,
            // cameraDown: false,
            // cameraDownWasPressed:false,
            // cameraDownWasLifted:false,
            // cameraReset: false,
            // cameraResetWasPressed:false,
            // cameraResetWasLifted:false,
        }
        
        window.addEventListener( 'keydown', function(e) {
            this.handleDown(e.code)
        }.bind(this));
    
        window.addEventListener( 'keyup', function ( e ) {
            this.handleUp(e.code)
        }.bind(this));

        document.querySelector("canvas").addEventListener( 'mousedown', function( e ) {
            e.preventDefault();
            if (e.button === 0) {
                this.inputs.primaryClick = e
            } else if (e.button === 2) {
                this.inputs.secondaryClick = e
                return false;
            }
        }.bind(this))

        // Disable context menu on canvas
        document.querySelector("canvas").addEventListener('contextmenu', function(e) {
            e.preventDefault();
            if(this.leftHanded) {
                this.leftHanded = false
                this.config=this.rightHandedConfig
                Avern.Store.config.update(st => {
                    const updatedSt = {
                        ...st,
                        leftHanded: false
                    }
                    return updatedSt
                })
            } else {
                this.leftHanded = true
                this.config=this.leftHandedConfig
                Avern.Store.config.update(st => {
                    const updatedSt = {
                        ...st,
                        leftHanded: true
                    }
                    return updatedSt
                })
            }
            return false;
        }.bind(this), false);

    }

    setConfig(dominantHand) {
        if (dominantHand !== "left") {
            this.leftHanded = false
            this.config=this.rightHandedConfig
        }
    }

    getInputs() {
        return this.inputs
    }
    update() {
        for (const property in this.config) {
            if (this.config[property].pressed && this.config[property].onlyOnce) this.inputs[property] = false
            if (this.config[property].pressed && this.config[property].trackWasPressed) this.inputs[`${property}WasPressed`] = false
            if (this.config[property].trackUp && this.inputs[`${property}WasLifted`]) this.inputs[`${property}WasLifted`] = false
        }
        if (this.inputs.primaryClick) {
            this.inputs.primaryClick = null
        }
        if (this.inputs.secondaryClick) {
            this.inputs.secondaryClick = null
        }
    }

    handleDown(code) {
        for (const property in this.config) {
            if (this.config[property].code === code) {
                if (document.querySelector(`#${property}`)) {
                    document.querySelector(`#${property}`).classList.add("active")
                }
                if (!this.config[property].onlyOnce) this.inputs[property] = true
                if (!this.config[property].pressed) {
                    if (this.config[property].onlyOnce) this.inputs[property] = true
                    this.config[property].pressed = true
                    if (this.config[property].trackWasPressed) this.inputs[`${property}WasPressed`] = true
                }
            }
        }
    }

    handleUp(code) {
        // if (document.querySelector(`#${code}`)) {
        //     document.querySelector(`#${code}`).classList.remove("active")
        // }
        for (const property in this.config) {
            if (this.config[property].code === code) {
                if (document.querySelector(`#${property}`)) {
                    document.querySelector(`#${property}`).classList.remove("active")
                }
                if (!this.config[property].onlyOnce) this.inputs[property] = false
                this.config[property].pressed = false
                if (this.config[property].trackUp) this.inputs[`${property}WasLifted`] = true
            }
        }
    }
}

export default Inputs