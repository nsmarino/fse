import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import playerGltf from "../../../../assets/actors/TestActor.glb"

import GameplayComponent from '../../_Component';
import Actions from "./Actions"
import InteractionOverlay from '../../Interface/InteractionOverlay';
import Enemy from '../NonPlayer/Enemy';
import Vitals from './Vitals';
import Inventory from './Inventory';
import gsap from "gsap"
import { get } from "svelte/store"
import {generateCapsuleCollider} from "../../../helpers"
import CombatMode from './CombatMode';

const RESET = "RESET"
const REPLACE = "REPLACE"

class Body extends GameplayComponent {
    constructor(gameObject, to) {
        super(gameObject)
        this.gameObject = gameObject
        this.gltf = null
        this.run = null
        this.idle = null
        this.radius = 0.8
        this.velocity = new THREE.Vector3();
        this.transform = gameObject.transform

        this.inCombat = false

        this.turnSpeed = 0.005

        this.targeting = false

        this.action = {
            id: null,
            anim: null,
            crucialFrame: null,
        }

        this.movementLocked = false
        this.crucialFrameSent = false

        if (to) {
            const spawnFrom = Avern.GameObjects.getGameObjectByName(to)
            this.transform.position.copy(spawnFrom.transform.position)
            this.gameObject.transform.rotation.copy(spawnFrom.transform.rotation)

        } else {
            this.transform.position.set( 0, 3, 0 )
        }

        this.transform.capsuleInfo = {
            radius: this.radius,
            segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, -1.0, 0.0 ))
        };

        this.originVector = new THREE.Vector3()
        this.originVector.copy(this.gameObject.transform.position)
        this.groundRaycast = new THREE.Raycaster(this.originVector, new THREE.Vector3(0, -1, 0))
        this.groundRaycast.firstHitOnly = true
        this.distanceToGround = 0
        this.isOnGround = false
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempBox = new THREE.Box3();
        this.tempMat = new THREE.Matrix4();

        this.tempSegment = new THREE.Line3();
        this.capsuleCollisionDelta = new THREE.Vector3()

        const init = async () => {
            this.gltf = await new GLTFLoader().loadAsync(playerGltf)

            this.gltf.scene.name = gameObject.name
            // this.gltf.scene.rotation.x = -Math.PI / 2
            this.transform.add(this.gltf.scene)
            this.gltf.scene.traverse(child => {
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false;

                // Something is still weird here...8.3.24
                // weird hardcoding for mixamo model :(
                child.translateY(-0.8)
                child.translateZ(1)
            })

            // Hidden by default; weapon associated with first Action
            // is visible in Explore and used for white attacks;
            // all other weapons have visibility toggled when their
            // Actions are used
            const WeaponNames = [
                "TestWeapon"
            ]
            for (const weaponName of WeaponNames) {
                const weapon = this.gltf.scene.getObjectByName(weaponName)
                weapon.visible = true
            }

            this.transform.add(this.gltf.scene)

            this.mixer = new THREE.AnimationMixer( this.gltf.scene );

            const clips = Avern.mixamoAnims
            
            // Player actions
            this.idle = {
                id: "idle",
                anim: this.setUpAnim(clips, "IdleExplore", true, false),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.idleCombat = {
                id: "idle_combat",
                anim: this.setUpAnim(clips, "IdleCombat", true, false),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.run = {
                id: "forward",
                anim: this.setUpAnim(clips, "Forward", true, false),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.runBack = {
                id: "back",
                anim: this.setUpAnim(clips, "Back", true, false, 1),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.runTurn = {
                id: "run_turn",
                anim: this.setUpAnim(clips, "RunTurn", false, true),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.idleTurn = {
                id: "idle_turn",
                anim: this.setUpAnim(clips, "StandTurn", false, true),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.strafeLeft = {
                id: "strafe_left",
                anim: this.setUpAnim(clips, "StrafeLeft", true, false),
                crucialFrame: null,
                canInterrupt: false,
            },
            this.strafeRight = {
                id: "strafe_right",
                anim: this.setUpAnim(clips, "RightStrafe", true, false),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.death = {
                id: "death",
                anim: this.setUpAnim(clips, "Die", false, true),
                crucialFrame: null,
                canInterrupt: false,
            }
            this.simpleAttack = {
                id: "simple_attack",
                anim: this.setUpAnim(clips, "SimpleAttack", false, true, 1),
                crucialFrame: 10,
                canInterrupt: false,
            }


            this.action = this.idle
            this.fadeIntoAction(this.action, 0, false)

            this.mixer.addEventListener('finished', this.onMixerFinish.bind(this))

            this.visionStart = this.gltf.scene.getObjectByName("vision-start")
            this.visionEnd = this.gltf.scene.getObjectByName("vision-end")
            this.visionRadius = this.gltf.scene.getObjectByName("vision-radius")
            this.visionCapsule = generateCapsuleCollider(
              this.visionStart,
              this.visionEnd,
              this.visionRadius
            )
        }
        init()
    }

    setUpAnim(fileClips, clipName, loop, clamp, duration) {
        const anim = this.mixer.clipAction(THREE.AnimationClip.findByName(fileClips, clipName))
        if (clamp) anim.clampWhenFinished = true
        if (duration) anim.setDuration(duration)
        if (!loop) anim.setLoop(THREE.LoopOnce)
        return anim
    }

    onMixerFinish(e) {
        const inputs = Avern.Inputs.getInputs()

        /* eslint-disable no-fallthrough */
        switch(e.action) {
            case this.idleTurn.anim:
            case this.runTurn.anim:
                if (inputs.forward) {
                    this.fadeIntoAction(this.run, 0.001, REPLACE)
                } else if (inputs.back) {
                    this.fadeIntoAction(this.run, 0.001, REPLACE)
                    this.backIsForwards = true
                } else {
                    this.fadeIntoAction(this.idle, 0.001, REPLACE)
                    Avern.Sound.fxHandler.pause()
                }
                this.gameObject.transform.rotateY(Math.PI)
                break;
            // case this.drink.anim:
            //     this.emitSignal("player_heal")
            // case this.shoot.anim:
            // case this.fire.anim:
            // case this.thrust_slash.anim:
            // case this.pommel_smack.anim:
            // case this.lose_yourself.anim:
            // case this.open_artery.anim:
            // case this.slash.anim:
            // case this.club.anim:
            case this.simpleAttack.anim:
                if (inputs.forward) {
                    this.fadeIntoAction(this.run, 0.1, REPLACE)
                } else if (inputs.back) {
                    this.fadeIntoAction(this.runBack, 0.1, REPLACE)
                } else {
                    this.fadeIntoAction(this.idleCombat, 0.1, REPLACE)
                }
                if (inputs.forward || inputs.back || (inputs.left && this.targeting) || (inputs.right && this.targeting) ) Avern.Sound.fxHandler.play()
                this.movementLocked = false
                this.crucialFrameSent = false;
                this.emitSignal("finish_attack_anim")      
                break;
        }
        /* eslint-enable no-fallthrough */
    }

    fadeIntoAction(newAction, duration, handleCurrent="CONTINUE") {
        if (handleCurrent===REPLACE) {
            this.action.anim.fadeOut(duration);
            this.action = newAction
        } else if (handleCurrent===RESET && !this.crucialFrameSent) {
            this.action.anim.reset()
            this.action.anim.play()
        }
        newAction.anim.reset();
        newAction.anim.fadeIn(duration);
        newAction.anim.play();
    }

    update(delta) {
        if (this.action.anim != null && this.action.crucialFrame != null) {
            const currentFrame = Math.floor(this.action.anim.time * 30);
            if (currentFrame >= this.action.crucialFrame && !this.crucialFrameSent) {
              this.crucialFrameSent = true;
              this.emitSignal("action_crucial_frame", {id: this.action.id})
            }
        }

        const inputs = Avern.Inputs.getInputs()
        if (!Avern.State.playerDead && !this.movementLocked && !Avern.State.worldUpdateLocked) {
            if (inputs.flask && get(Avern.Store.player).flasks > 0) {
                this.movementLocked = true
                Avern.Sound.drinkHandler.currentTime = 0
                Avern.Sound.drinkHandler.play()
                this.fadeIntoAction(this.drink,0.2, REPLACE)
            }
            if (inputs.fruit) {
                this.emitSignal("eat_fruit")
            }
            if (inputs.turnWasPressed) {
                if (inputs.forward || inputs.back) {
                    this.fadeIntoAction(this.runTurn, 0.1, REPLACE)
                } else {
                    this.fadeIntoAction(this.idleTurn, 0.1, REPLACE)
                }
            }
            if ( inputs.forwardWasPressed) {
                this.fadeIntoAction(this.run, 0.2, REPLACE)
                Avern.Sound.fxHandler.currentTime = 0
                Avern.Sound.fxHandler.play()
                this.emitSignal("walk_start")
            }
            if ( inputs.backWasPressed) {
                Avern.Sound.fxHandler.currentTime = 0
                Avern.Sound.fxHandler.play()
                this.emitSignal("walk_start")
                this.fadeIntoAction(this.runBack, 0.2, REPLACE)
            }

            if ( inputs.leftWasPressed && this.targeting ) {
                Avern.Sound.fxHandler.currentTime = 0
                Avern.Sound.fxHandler.play()
                this.emitSignal("walk_start")
                this.fadeIntoAction(this.strafeLeft, 0.2, REPLACE)
            }
            if ( inputs.rightWasPressed && this.targeting ) {
                Avern.Sound.fxHandler.currentTime = 0
                Avern.Sound.fxHandler.play()
                this.emitSignal("walk_start")
                this.fadeIntoAction(this.strafeRight, 0.2, REPLACE)
            }

            if (inputs.backWasLifted && this.backIsForwards) this.backIsForwards = false

            if ( inputs.forwardWasLifted || inputs.backWasLifted || inputs.leftWasLifted || inputs.rightWasLifted ) {
                if (this.action == this.runTurn || this.action == this.idleTurn) return
                if (inputs.forward || (inputs.back && this.backIsForwards)){
                    if (this.action.id == this.run.id) return
                    this.fadeIntoAction(this.run, 0.1, REPLACE)
                } else if (inputs.back && !this.backIsForwards) {
                    if (this.action.id == this.runBack.id) return
                    this.fadeIntoAction(this.runBack, 0.1, REPLACE)
                } else if (inputs.left && this.targeting) {
                    this.fadeIntoAction(this.strafeLeft, 0.1, REPLACE)
                } else if (inputs.right && this.targeting) {
                    this.fadeIntoAction(this.strafeRight, 0.1, REPLACE)
                } else {
                    if (this.inCombat) {
                        if (this.action != this.idleCombat) this.fadeIntoAction(this.idleCombat, 0.1, REPLACE)
                    } else {
                        if (this.action != this.idle) this.fadeIntoAction(this.idle, 0.1, REPLACE)
                    }
                    Avern.Sound.fxHandler.pause()
                }
            }        
        }
        if (this.mixer && Avern.State.worldUpdateLocked == false) this.mixer.update(delta);
    }

    onSignal(signalName, data={}) {
        switch(signalName) {
            case "casting_start":
                this.fadeIntoAction(this[data.animation], 0.1, REPLACE)
                break;
            case "casting_finish":
                this.fadeIntoAction(this.idle, 0.1, REPLACE)
                break;
            case "casting_reduce":
                this.mixer.setTime(data.progress)
                break;
            case "action_availed":
                this.movementLocked = true
                Avern.Sound.fxHandler.pause()

                this.fadeIntoAction(this[data.action.animation],0.1, REPLACE)
                break;
            case "enter_combat":
                console.log("Enter combat!")
                this.inCombat = true
                this.fadeIntoAction(this.idleCombat, 0.1, REPLACE)
                break;
            case "end_combat":
                console.log("Exit combat (Body)")
                this.inCombat = false
                // this.fadeIntoAction(this.idle, 0.1, REPLACE)
                break;
            case "combat_round":
                this.movementLocked = true
                Avern.Sound.fxHandler.pause()
                this.fadeIntoAction(this.simpleAttack,0.1, REPLACE)
                // this.fadeIntoAction(this[data.action.animation],0.1, REPLACE)
                break;
            case "player_death":
                this.fadeIntoAction(this.death, 0, REPLACE)
                gsap.to(".mask", { opacity: 1, duration: 4, delay: 2})
                gsap.to(".mask svg", { opacity: 1, duration: 0.2, delay: 3})
                gsap.to(".mask p", { opacity: 1, duration: 0.2, delay: 3})
        
                setTimeout(()=> {
                    // Handle resets internal to this component
    
                    this.gameObject.transform.position.set( 0, 3, 0 );
                    this.fadeIntoAction(this.idle, 0.1, REPLACE)

                    this.movementLocked = false
                    this.crucialFrameSent = false

                    gsap.to(".mask", { opacity: 1, duration: 1})
                    gsap.to(".mask svg", { opacity: 1, duration: 1})
                    gsap.to(".mask p", { opacity: 1, duration: 1})
                    setTimeout(async () => {
                        Avern.State.playerDead = false
                        Avern.Store.player.update(player => {
                            const updatedPlayer = {
                              ...player,
                              hp: player.maxHp
                            }
                            return updatedPlayer
                          })
                        await Avern.Loader.switchScene("player-restart")
                    }, 1000)
                },6000)
                break;
            case "capsule_collide":
                if (!Avern.State.worldUpdateLocked) this.onCapsuleCollide(data)
                break;
            case "active_target":
                this.targeting = true
                break;
            case "clear_target":
                this.targeting = false
                break;
            case "targeted_object":
                // lazy fix for bug in auto-target on death of current target
                if (!this.targeting) this.targeting=true
                const lookVector = new THREE.Vector3(data.object.transform.position.x, this.transform.position.y, data.object.transform.position.z)
                this.transform.lookAt(lookVector)
                break;
            case "world_collide":
                if (!Avern.State.playerDead && !Avern.State.worldUpdateLocked) this.onWorldCollide(data)
                break;
        }
    }
    
    onCapsuleCollide(data) {
        this.capsuleCollisionDelta.subVectors( data.collision.closestPoint1, data.collision.closestPoint2 );
        const depth = this.capsuleCollisionDelta.length() - ( this.radius + data.capsule.radius );
        if ( depth < 0 ) {
            this.capsuleCollisionDelta.normalize();

        // get the magnitude of the velocity in the hit direction
        const v1dot = this.deltaVector.dot( this.capsuleCollisionDelta );
        const v2dot = data.capsule.velocity.dot( this.capsuleCollisionDelta );
    
        const offsetRatio1 = Math.max( v1dot, 0.2 );
        const offsetRatio2 = Math.max( v2dot, 0.2 );

        const total = offsetRatio1 + offsetRatio2;
        const ratio = offsetRatio1 / total;
        this.capsuleCollisionDelta.y = 0
        this.transform.position.addScaledVector( this.capsuleCollisionDelta, - ratio * depth );
        }
    }

    onWorldCollide(data) {
        const { collider, delta } = data
        const inputs = Avern.Inputs.getInputs()
        const transform = this.transform

        transform.updateMatrixWorld();

        // adjust player position based on collisions
        const capsuleInfo = transform.capsuleInfo;

        this.tempBox.makeEmpty();
        this.tempMat.copy( collider.matrixWorld ).invert();
        this.tempSegment.copy( capsuleInfo.segment );

        // get the position of the capsule in the local space of the collider
        this.tempSegment.start.applyMatrix4( transform.matrixWorld ).applyMatrix4( this.tempMat );
        this.tempSegment.end.applyMatrix4( transform.matrixWorld ).applyMatrix4( this.tempMat );

        // get the axis aligned bounding box of the capsule
        this.tempBox.expandByPoint( this.tempSegment.start );
        this.tempBox.expandByPoint( this.tempSegment.end );

        this.tempBox.min.addScalar( - capsuleInfo.radius );
        this.tempBox.max.addScalar( capsuleInfo.radius );

        collider.geometry.boundsTree.shapecast( {
            intersectsBounds: box => box.intersectsBox( this.tempBox ),
            intersectsTriangle: tri => {
                // check if the triangle is intersecting the capsule and adjust the
                // capsule position if it is.
                const triPoint = this.tempVector;
                const capsulePoint = this.tempVector2;
    
                const distance = tri.closestPointToSegment( this.tempSegment, triPoint, capsulePoint );
                if ( distance < capsuleInfo.radius ) {
                    const depth = capsuleInfo.radius - distance;
                    const direction = capsulePoint.sub( triPoint ).normalize();
                    this.tempSegment.start.addScaledVector( direction, depth );
                    this.tempSegment.end.addScaledVector( direction, depth );
                }
            }
        });
    
        // get the adjusted position of the capsule collider in world space after checking
        // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
        // the origin of the player model.
        const newPosition = this.tempVector;
        newPosition.copy( this.tempSegment.start ).applyMatrix4( collider.matrixWorld );
        // check how much the collider was moved
        const deltaVector = this.tempVector2;
        deltaVector.subVectors( newPosition, transform.position );

        // Did you fall through the hole in the ground?
        if ( transform.position.y < - 100 ) {
            this.velocity.set( 0, 0, 0 );
            transform.position.set( 0, 3, 0 );
        }

        this.gameObject.transform.getWorldPosition(this.originVector)
        const groundIntersect = this.groundRaycast.intersectObject(collider)
        this.distanceToGround = groundIntersect[0] ? groundIntersect[0].distance : null

        // Add movement from user input to vector from collision data
        const inputVector = new THREE.Vector3()
        const strafeVector = new THREE.Vector3()

        if ( (inputs.forward && !this.movementLocked) || inputs.back && !this.movementLocked && this.backIsForwards) {
            const forwardSpeed = 12
            transform.getWorldDirection(inputVector).multiplyScalar(delta).multiplyScalar(forwardSpeed)
            deltaVector.add(inputVector)
        } else if ( inputs.back && !this.movementLocked ) {
            transform.getWorldDirection(inputVector).multiplyScalar(delta).multiplyScalar(-6)
            deltaVector.add(inputVector)
        }
        if ( inputs.left ) {
            if (this.targeting && !this.movementLocked) {
                const perpendicularVector = new THREE.Vector3();
                perpendicularVector.crossVectors(transform.getWorldDirection(strafeVector), new THREE.Vector3(0, 1, 0));
                perpendicularVector.normalize().multiplyScalar(delta).multiplyScalar(-4);
                deltaVector.add(perpendicularVector);
            } else if (!this.targeting) {
                transform.rotateY(this.turnSpeed)
            }
        }
            
        if ( inputs.right ) {
            if (this.targeting && !this.movementLocked) {
                const perpendicularVector = new THREE.Vector3();
                perpendicularVector.crossVectors(transform.getWorldDirection(strafeVector), new THREE.Vector3(0, 1, 0));
                perpendicularVector.normalize().multiplyScalar(delta).multiplyScalar(4);
                deltaVector.add(perpendicularVector);
            } else if (!this.targeting) {
                transform.rotateY(-this.turnSpeed)
            }
        }

        // if ( inputs.jump ) {
        //     if (this.distanceToGround < 2.1 && this.distanceToGround !== null) {
        //         this.velocity.y = Avern.Config.player.jumpHeight
        //         this.emitSignal("spend_energy", {cost: 1})
        //     }
        // }

        // if the player was primarily adjusted vertically we assume it's on something we should consider ground
        this.isOnGround = deltaVector.y > Math.abs( delta * this.velocity.y * 0.25 );
        const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
        deltaVector.normalize().multiplyScalar( offset );

        if ( this.isOnGround && !inputs.jump) {
            this.velocity.y = delta * Avern.Config.world.gravity;
        } else {
            this.velocity.y += delta * Avern.Config.world.gravity;
        }
        transform.position.addScaledVector( this.velocity, delta );
        transform.position.add( deltaVector );
        this.deltaVector = deltaVector
    }

    attachObservers(parent) {
        this.addObserver(parent.getComponent(Actions))
        this.addObserver(Avern.Interface.getComponent(InteractionOverlay))
        this.addObserver(parent.getComponent(Vitals))
        this.addObserver(parent.getComponent(Inventory))
        this.addObserver(parent.getComponent(CombatMode))
        for (const enemy of Avern.State.Enemies) {
            this.addObserver(enemy.getComponent(Enemy))
        }
    }
}

export default Body