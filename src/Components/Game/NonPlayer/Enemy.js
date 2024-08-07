import * as THREE from 'three';
import gsap from "gsap"
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import GameplayComponent from '../../_Component';

import { NavMeshQuery,  Detour,
  NavMesh,
  QueryFilter,
  Raw, } from '@recast-navigation/core';

import { 
  generateCapsuleCollider, 
  checkCapsuleCollision, 
  randomIntFromInterval,
  findClosestPointOnMeshToPoint,
  updateRotationToFacePoint,
} from '../../../helpers';
import Body from '../Player/Body';
import FollowCamera from '../Player/FollowCamera';
import zombieBow from "../../../../assets/monsters/bow-large.gltf"
import zombieSword from "../../../../assets/monsters/sword-large.gltf"
import Vitals from '../Player/Vitals';
import Actions from '../Player/Actions';
import ItemOnMap from './ItemOnMap';
import Targetable from './Targetable';
import Targeting from '../Player/Targeting';
import {get} from 'svelte/store'
import CombatMode from '../Player/CombatMode';
import { Vector3 } from "three";

class Enemy extends GameplayComponent {
  constructor(gameObject, spawnPoint) {
    super(gameObject)
    this.gameObject = gameObject
    this.gameObject.transform.position.copy(spawnPoint.position)

    // find player even if they're slightly off the navmesh
    this.navMeshSearchThreshold = new THREE.Vector3(3,3,3)

    // Array of vectors for enemy to patrol thru
    this.patrolPoints = []
    this.patrolIndex = 0

    if (spawnPoint.children.length > 0) {
      for (const child of spawnPoint.children) {
        const worldPos = child.getWorldPosition(new THREE.Vector3())
        this.patrolPoints.push(worldPos)
      }
      this.gameObject.transform.position.copy(this.patrolPoints[0])
      this.startingBehavior = "patrol"
    } else {
      this.gameObject.transform.position.copy(spawnPoint.position)
      this.startingBehavior = "idle"
    }
  
    this.enemyType = spawnPoint.userData.label

    this.bar = document.createElement("div")
    this.innerBar = document.createElement("div")
    this.bar.classList.add("enemy-bar")
    this.innerBar.classList.add("inner-enemy-bar")

    this.bar.appendChild(this.innerBar)

    document.body.appendChild(this.bar)
    gsap.set(this.bar, { opacity: 0})

    this.numbersContainer = document.createElement("div")
    this.numbersContainer.classList.add("numbers-container")
    document.body.appendChild(this.numbersContainer)

    this.isTargeted = false

    switch(this.enemyType) {
      case "bow":
        this.initialHealth = 90
        this.health = 90
            break;
      case "sword":
        this.initialHealth = 100
        this.health = 100
        break;
    }

    this.prevAngle = null
    this.originalSpawnPoint = spawnPoint

    Avern.State.Enemies.push(this.gameObject)

    this.behavior = this.startingBehavior
    this.velocity = new THREE.Vector3( 0, 0, 0 );
    this.patrolSpeed = 2
    this.pursueSpeed = 8
    this.lerpFactor = 0.2
    this.path = null
    this.maxWanderDistance = 15
    this.prevPlayerPosition = new THREE.Vector3()

    const initFromGLTF = async () => {
      switch(this.enemyType) {
        case "bow":
          this.body = zombieBow
          break;
        case "sword":
          this.body = zombieSword
          break;
      }
      this.gltf = await new GLTFLoader().loadAsync(this.body)
      this.gltf.scene.name = gameObject.name

      gameObject.transform.add(this.gltf.scene)
      this.gltf.scene.traverse(child => {
        child.castShadow = true;
        child.frustumCulled = false;
    })

      // COLLISION
      this.capsuleBottom = this.gltf.scene.getObjectByName("capsule-bottom")
      this.capsuleTop = this.gltf.scene.getObjectByName("capsule-top")
      this.capsuleRadius = this.gltf.scene.getObjectByName("capsule-radius")

      this.colliderCapsule = generateCapsuleCollider(
        this.capsuleBottom,
        this.capsuleTop,
        this.capsuleRadius
      )
      this.startWorldPos = new THREE.Vector3()
      this.endWorldPos = new THREE.Vector3()
  
      gameObject.transform.add(this.colliderCapsule.body)

      this.visionStart = this.gltf.scene.getObjectByName("vision-start")
      this.visionEnd = this.gltf.scene.getObjectByName("vision-end")
      this.visionRadius = this.gltf.scene.getObjectByName("vision-radius")
      this.visionCapsule = generateCapsuleCollider(
        this.visionStart,
        this.visionEnd,
        this.visionRadius
      )
      this.visionStartWorldPos = new THREE.Vector3()
      this.visionEndWorldPos = new THREE.Vector3()

      // Anims
      this.mixer = new THREE.AnimationMixer( this.gltf.scene );

      this.clips = this.gltf.animations
      switch (this.startingBehavior) {
        case "wander":
        case "patrol":
        case "pursue":
          this.action = this.mixer.clipAction(THREE.AnimationClip.findByName(this.clips, "WALK"))
          break;
        case "idle":
          this.action = this.mixer.clipAction(THREE.AnimationClip.findByName(this.clips, "IDLE"))
          break;
      }

      this.idle = this.mixer.clipAction(
        THREE.AnimationClip.findByName(this.clips, "IDLE")
      )
      this.walk = this.mixer.clipAction(
          THREE.AnimationClip.findByName(this.clips, "WALK")
      )
      this.death = this.mixer.clipAction(
          THREE.AnimationClip.findByName(this.clips, "DEATH")
      )
      this.death.setLoop(THREE.LoopOnce)
      this.death.clampWhenFinished = true


      this.reactLarge = this.mixer.clipAction(
          THREE.AnimationClip.findByName(this.clips, "REACT_LARGE")
      )
      this.reactLarge.setLoop(THREE.LoopOnce)

      this.attackRange = null

      switch(this.enemyType) {
        case "bow":
          this.attack = this.mixer.clipAction(
            THREE.AnimationClip.findByName(this.clips, "SHOOT")
          )
          this.rangeWidth = 24

          this.actionRange = 45
          this.crucialFrame = 80
          break;
        case "sword":
          this.attack = this.mixer.clipAction(
            THREE.AnimationClip.findByName(this.clips, "SLASH")
          )
          this.attack.setDuration(2.5)
          this.rangeWidth = 4

          this.actionRange = 3
          this.crucialFrame = 24
          break;
      }
      this.attack.setLoop(THREE.LoopOnce)
      this.attack.clampWhenFinished = true

      this.mixer.addEventListener('finished', this.onMixerFinish.bind(this))

      this.fadeIntoAction(this.action,0)

      this.targetingTriangle = new THREE.Triangle()

      this.frontDirection = new THREE.Vector3(0, 0, -1); // Negative Z direction for front
      this.leftDirection = new THREE.Vector3(-1, 0, 0); // Negative X direction for left
      this.rightDirection = new THREE.Vector3(1, 0, 0); // Positive X direction for right

      this.tempLeft = new THREE.Vector3()
      this.tempRight = new THREE.Vector3()
      this.tempFront = new THREE.Vector3()

      this.tempLeft.copy(this.leftDirection).multiplyScalar(this.rangeWidth)
      this.tempRight.copy(this.rightDirection).multiplyScalar(this.rangeWidth)
      this.tempFront.copy(this.frontDirection).multiplyScalar(-this.actionRange)

      this.triangleA = new THREE.Object3D()
      this.gameObject.transform.add(this.triangleA)
      this.triangleA.z += 1

      this.triangleB = new THREE.Object3D()
      this.gameObject.transform.add(this.triangleB)
      this.triangleB.position.add(this.tempLeft).add(this.tempFront);

      this.triangleC = new THREE.Object3D()
      this.gameObject.transform.add(this.triangleC)
      this.triangleC.position.add(this.tempRight).add(this.tempFront);
      this.gameObject.transform.rotation.y = spawnPoint.rotation.y
    }
    initFromGLTF()
  }

  fadeIntoAction(newAction, duration) {
    if (this.current_action) {
        this.current_action.fadeOut(duration);
    }
    this.action = newAction
    this.action.reset();
    this.action.fadeIn(duration);
    this.action.play();
    this.current_action = this.action;
  }

  onMixerFinish(e) {
    if (e.action == this.attack) {
        if (this.behavior=="die_lol") return
        this.behavior = "pursue"
        this.fadeIntoAction(this.walk,0.1)
        this.crucialFrameSent = false
    }
    if (e.action == this.death) {

      // chance of dropping healing flask
      const randomInt = randomIntFromInterval(1,3)
      if (randomInt===1 && (get(Avern.Store.player).flasks < 5)) {
        const itemOnMap = Avern.GameObjects.createGameObject(Avern.State.scene, `${this.gameObject.name}-item`)
        const itemContent = Avern.Content.items.find(i => i.label === "healing-flask")
        itemOnMap.addComponent(ItemOnMap, this.gameObject.transform, itemContent)
        itemOnMap.canBeTargeted = true
        itemOnMap.addComponent(Targetable, false, 1)
        itemOnMap.getComponent(ItemOnMap).attachObservers(itemOnMap)
        itemOnMap.getComponent(Targetable).attachObservers(itemOnMap)
      }

      setTimeout(() => {
        this.removeFromScene()
      }, 1000)
    }
  }
  
  removeFromScene() {
    this.gameObject.removeFromScene()
    this.gameObject.sleep = true
    this.bar.style.display="none"
  }

  checkTarget(){
    if (!Avern.Player || !this.targetingTriangle) return;
    const targetPosition = Avern.Player.transform.position
    this.targetingTriangle.set(this.triangleA.getWorldPosition(new THREE.Vector3()), this.triangleB.getWorldPosition(new THREE.Vector3()), this.triangleC.getWorldPosition(new THREE.Vector3()))
    // this.triangleA.getWorldPosition(this.mesh.position)
    // this.triangleB.getWorldPosition(this.mesh2.position)
    // this.triangleC.getWorldPosition(this.mesh3.position)

    return this.targetingTriangle.containsPoint(targetPosition)
  }

  update(delta){
    if (Avern.State.worldUpdateLocked == true) return

    switch(this.behavior) {
      case "idle":
          break;
      case "patrol":
          this.followPatrolPath(delta)
          break;
      case "pursue":
          this.followPursuePath(delta)
          break;
      case "attack":
        if (!this.crucialFrameSent) updateRotationToFacePoint(this.gameObject.transform, Avern.Player.transform.position, this.lerpFactor)

        if (Math.floor(this.action.time * 30) >= this.crucialFrame && !this.crucialFrameSent) {
          this.crucialFrameSent = true;
          if(!Avern.State.playerDead && this.checkTarget()) {
            switch(this.enemyType) {
              case "sword":
                this.emitSignal("monster_attack", {damage: 10, percentage: 0.5})
                break;
              case "bow":
                const projectileDestination = new THREE.Vector3().copy(Avern.Player.transform.position)
                projectileDestination.y - 2.5
                this.emitSignal("launch_projectile", {
                  destination: projectileDestination,
                  radius: 1,
                  speed: 33,
                })
                break;
            }
          }
        }
        break;
    }

    if (this.mixer) this.mixer.update(delta)
    if (this.behavior=="die_lol") return

    if (this.colliderCapsule) {
      this.capsuleBottom.getWorldPosition(this.startWorldPos)
      this.capsuleTop.getWorldPosition(this.endWorldPos)

      this.colliderCapsule.segment.start.copy(this.startWorldPos)
      this.colliderCapsule.segment.end.copy(this.endWorldPos)
      
      if (Avern.Player) {
        const collision = checkCapsuleCollision({ segment: Avern.Player.getComponent(Body).tempSegment, radius: Avern.Player.getComponent(Body).radius}, this.colliderCapsule)
        if (collision.isColliding) {
          this.emitSignal("capsule_collide", {collision, capsule: this.colliderCapsule})
        }
      }
      this.emitSignal("has_collider", {collider: this.colliderCapsule, offsetY: 2})
    }

    if (this.visionCapsule) {
      this.visionStart.getWorldPosition(this.visionStartWorldPos)
      this.visionEnd.getWorldPosition(this.visionEndWorldPos)

      this.visionCapsule.segment.start.copy(this.visionStartWorldPos)
      this.visionCapsule.segment.end.copy(this.visionEndWorldPos)

      if (Avern.Player) {
        const visionCollision = checkCapsuleCollision({ segment: Avern.Player.getComponent(Body).tempSegment, radius: Avern.Player.getComponent(Body).radius}, this.visionCapsule)
        if (visionCollision.isColliding && (this.behavior=="wander" || this.behavior=="idle" || this.behavior=="patrol")) {
          if (this.behavior=="idle") this.fadeIntoAction(this.walk, 0.1)

          if (this.enemyType=="sword") {
            Avern.Sound.alert2Handler.currentTime = .4
            Avern.Sound.alert2Handler.play()   
            } else {
              Avern.Sound.alertHandler.currentTime = 0
              Avern.Sound.alertHandler.play()   
            }

          this.behavior="pursue"
        }
      }
    }
  }

  followPatrolPath(deltaTime) {
    const destination = this.patrolPoints[this.patrolIndex]
    if (!destination) return
    if (this.gameObject.transform.position.distanceTo(destination) < 0.5) {
        this.patrolIndex = this.patrolPoints[this.patrolIndex + 1] ? this.patrolIndex + 1 : 0
        return
    } 

      if (!this.path || this.path.length===0) {
        // REFACTOR TO USE RECAST!
        
        // const path = Avern.yukaNavmesh.findPath(new YUKA.Vector3().copy(this.gameObject.transform.position), new YUKA.Vector3().copy(destination))
          this.path = []
      }
      if (!this.path || this.path.length===0) return;
      let targetPos = this.path[0];

      if (!targetPos) return
      this.velocity = new THREE.Vector3().copy(targetPos.clone().sub( this.gameObject.transform.position ));
      updateRotationToFacePoint(this.gameObject.transform, targetPos, this.lerpFactor)
      if (this.velocity.lengthSq() > 0.1 ) {
        this.velocity.normalize();
        
      // Move to next waypoint
        this.gameObject.transform.position.add( this.velocity.multiplyScalar( deltaTime * this.patrolSpeed ) );
        const closestPoint = findClosestPointOnMeshToPoint(Avern.State.env, this.gameObject.transform.position)
        if ( closestPoint) this.gameObject.transform.position.copy(closestPoint)          
      } else {
        this.path.shift();
      }
  }

  followPursuePath(deltaTime) {

    if (this.checkTarget() && this.gameObject.transform.position.distanceTo(Avern.Player.transform.position) < this.actionRange) {
        this.behavior = "attack"
        this.fadeIntoAction(this.attack, 0)
        return
    } else {

        // VERY EXPENSIVE NAVMESH QUERY FOR PATHING!!!
        // need to find a way to avoid recalcing this on every frame LMAO
        const navMeshQuery = new NavMeshQuery(Avern.navMesh)

        const enemyPointOnNavmesh = navMeshQuery.findClosestPoint(this.gameObject.transform.position);
      
        const targetDest = navMeshQuery.findClosestPoint(Avern.Player.transform.position, { 
          halfExtents: this.navMeshSearchThreshold 
        })

        // const recastResponse = navMeshQuery.computePath(this.gameObject.transform.position, targetDest.point)
        const smoothResponse = computeSmoothPath(Avern.navMesh, navMeshQuery, this.gameObject.transform.position,targetDest.point)
        this.path = smoothResponse.path

        if (!this.path[1]) return
        let targetPosition = new THREE.Vector3(this.path[1].x,this.path[1].y,this.path[1].z);

        this.velocity = new THREE.Vector3().copy(targetPosition.clone().sub( this.gameObject.transform.position ));
        updateRotationToFacePoint(this.gameObject.transform, targetPosition, this.lerpFactor)
        if (this.velocity.lengthSq() > 0.1 ) {
          this.velocity.normalize();
          // Move to next waypoint
          this.gameObject.transform.position.add( this.velocity.multiplyScalar( deltaTime * this.pursueSpeed ) );
          const closestPoint = findClosestPointOnMeshToPoint(Avern.State.env, this.gameObject.transform.position)
          if ( closestPoint) this.gameObject.transform.position.copy(closestPoint)          
        } else {
          this.path.shift();
        }
        this.prevPlayerPosition.copy(Avern.Player.transform.position)
    }
  }

  handleDeath() {
    this.behavior = "die_lol"
    Avern.Sound.enemyDieHandler.currentTime = 0
    Avern.Sound.enemyDieHandler.play()   
    // This should only emit signal (perhaps a more specific enemy_death signal?); target logic should be handled in "Targetable" component
    this.onSignal("clear_target")
    this.emitSignal("clear_target", {visible: false, dead: true, id: this.gameObject.name})
    Avern.State.Enemies = Avern.State.Enemies.filter(enem => enem.name !== this.gameObject.name)
    this.dead = true
    Avern.Store.player.update(player => {
      return {
        ...player,
        xp: player.xp + 80
      }
    })
    this.fadeIntoAction(this.death, 0.2)
  }

  onSignal(signalName, data={}) {
    switch(signalName) {
      case "set_target":
        if (data.id !== this.gameObject.name && this.isTargeted) {
          this.isTargeted = false
          gsap.set(this.bar, { opacity: 0})
        } else if (data.id === this.gameObject.name) {
          this.isTargeted = true
          gsap.set(this.bar, { opacity: 1})
        }
        break;

      case "targeted_object":
        const minDistance = 10; // Minimum distance for scaling
        const maxDistance = 100; // Maximum distance for scaling
        const scaleFactor = THREE.MathUtils.clamp(
          1 - (data.distanceToCamera - minDistance) / (maxDistance - minDistance),
          0.1, // Minimum scale factor
          1  // Maximum scale factor
        );
        const translateX = data.x;
        const translateY = data.y;
        this.bar.style.display="block"
        this.bar.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scaleFactor})`;
        this.numbersContainer.style.display="block"
        this.numbersContainer.style.transform = `translate(50%, 50%) translate(${translateX}px, ${translateY}px) scale(${scaleFactor})`;
        break;

      case "receive_direct_attack":
        if (this.isTargeted===true) {
          Avern.Sound.thudHandler.currentTime = 0.1
          Avern.Sound.thudHandler.play()   

          // if (data.generate === true) {
          //   Avern.Store.player.update(player => {
          //     const updatedPlayer = {
          //       ...player,
          //       energy: player.energy + 20 >= 100 ? 100 : player.energy + 20
        
          //     }
          //     return updatedPlayer
          //   })            
          // }

          if (this.behavior === "wander" || this.behavior === "patrol") {
            this.path = null
            this.behavior = "pursue"
            if (this.enemyType=="sword") {
              Avern.Sound.alert2Handler.currentTime = 0.4
              Avern.Sound.alert2Handler.play()   
              } else {
                Avern.Sound.alertHandler.currentTime = 0
                Avern.Sound.alertHandler.play()   
              }
            }
          if (this.behavior=="idle") {
            this.path = null
            this.behavior = "pursue"
            if (this.enemyType=="sword") {
              Avern.Sound.alert2Handler.currentTime = 0.4
              Avern.Sound.alert2Handler.play()   
              } else {
                Avern.Sound.alertHandler.currentTime = 0
                Avern.Sound.alertHandler.play()   
              }   
            this.fadeIntoAction(this.walk, 0.1)
          }
          this.health -= data.damage
          this.innerBar.style.width = this.health > 0 ? `${(this.health / this.initialHealth) * 100}%` : 0

          const damageNumber = document.createElement('span')
          damageNumber.innerHTML = Math.floor(data.damage)
          this.numbersContainer.appendChild(damageNumber)
          setTimeout(()=>damageNumber.remove(), 2000)

          if (this.health <= 0) {
            this.handleDeath()
          } else {
            if (this.behavior !== "attack") {
              this.reactLarge.reset();
              this.reactLarge.fadeIn(0.2);
              this.reactLarge.play();
            }
          }
        }
        break;
      case "reset_stage":
        if (this.dead) {
          Avern.State.scene.add(this.gameObject.transform)
          Avern.State.Enemies.push(this.gameObject)
          this.gameObject.sleep = false
          this.dead = false
        }
        this.isTargeted = false;
        this.health = this.initialHealth
        this.innerBar.style.width = `100%`
        this.behavior = this.startingBehavior
        this.gameObject.transform.position.copy(this.originalSpawnPoint.position)
        this.gameObject.transform.rotation.y = this.originalSpawnPoint.rotation.y

        if (this.startingBehavior=="wander")this.fadeIntoAction(this.walk, 0.1)
        if (this.startingBehavior=="idle")this.fadeIntoAction(this.idle, 0.1)
        
        this.emitSignal("clear_target", {visible: false, id: this.gameObject.name})
        break;

      case "clear_target":
        this.isTargeted = false
        gsap.set(this.bar, { opacity: 0})
        break;
    }
  }

  attachObservers(parent) {
    for (const component of parent.components) {
      if (!(component instanceof Enemy)) {
        this.addObserver(component)
      }
    }
    this.addObserver(Avern.Player.getComponent(Targeting))
    this.addObserver(Avern.Player.getComponent(Body))
    this.addObserver(Avern.Player.getComponent(FollowCamera))
    this.addObserver(Avern.Player.getComponent(Vitals))
    this.addObserver(Avern.Player.getComponent(CombatMode))
  }
}

export default Enemy

const _delta = new THREE.Vector3();
const _moveTarget = new THREE.Vector3();

const ComputePathError = {
  START_NEAREST_POLY_FAILED: 'START_NEAREST_POLY_FAILED',
  END_NEAREST_POLY_FAILED: 'END_NEAREST_POLY_FAILED',
  FIND_PATH_FAILED: 'FIND_PATH_FAILED',
  NO_POLYGON_PATH_FOUND: 'NO_POLYGON_PATH_FOUND',
  NO_CLOSEST_POINT_ON_LAST_POLYGON_FOUND:
    'NO_CLOSEST_POINT_ON_LAST_POLYGON_FOUND',
};
function computeSmoothPath(
  navMesh,
  navMeshQuery,
  start,
  end,
  options
) {
  const filter = options?.filter ?? navMeshQuery.defaultFilter;
  const halfExtents =
    options?.halfExtents ?? navMeshQuery.defaultQueryHalfExtents;

  const maxSmoothPathPoints = options?.maxSmoothPathPoints ?? 48;

  const maxPathPolys = options?.maxPathPolys ?? 256;

  const stepSize = options?.stepSize ?? 0.5;
  const slop = options?.slop ?? 0.01;

  // find nearest polygons for start and end positions
  const startNearestPolyResult = navMeshQuery.findNearestPoly(start, {
    filter,
    halfExtents,
  });

  if (!startNearestPolyResult.success) {
    return {
      success: false,
      error: {
        type: ComputePathError.START_NEAREST_POLY_FAILED,
        status: startNearestPolyResult.status,
      },
      path: [],
    };
  }

  const endNearestPolyResult = navMeshQuery.findNearestPoly(end, {
    filter,
    halfExtents,
  });

  if (!endNearestPolyResult.success) {
    return {
      success: false,
      error: {
        type: ComputePathError.END_NEAREST_POLY_FAILED,
        status: endNearestPolyResult.status,
      },
      path: [],
    };
  }

  const startRef = startNearestPolyResult.nearestRef;
  const endRef = endNearestPolyResult.nearestRef;

  // find polygon path
  const findPathResult = navMeshQuery.findPath(startRef, endRef, start, end, {
    filter,
    maxPathPolys,
  });

  if (!findPathResult.success) {
    return {
      success: false,
      error: {
        type: ComputePathError.FIND_PATH_FAILED,
        status: findPathResult.status,
      },
      path: [],
    };
  }

  if (findPathResult.polys.size <= 0) {
    return {
      success: false,
      error: {
        type: ComputePathError.NO_POLYGON_PATH_FOUND,
      },
      path: [],
    };
  }

  const lastPoly = findPathResult.polys.get(findPathResult.polys.size - 1);

  let closestEnd = end;

  if (lastPoly !== endRef) {
    const lastPolyClosestPointResult = navMeshQuery.closestPointOnPoly(
      lastPoly,
      end
    );

    if (!lastPolyClosestPointResult.success) {
      return {
        success: false,
        error: {
          type: ComputePathError.NO_CLOSEST_POINT_ON_LAST_POLYGON_FOUND,
          status: lastPolyClosestPointResult.status,
        },
        path: [],
      };
    }

    closestEnd = lastPolyClosestPointResult.closestPoint;
  }

  // Iterate over the path to find a smooth path on the detail mesh
  const iterPos = new THREE.Vector3().copy(start);
  const targetPos = new THREE.Vector3().copy(closestEnd);

  const polys = [...findPathResult.polys.getHeapView()];
  let smoothPath = [];

  smoothPath.push(iterPos.clone());

  while (polys.length > 0 && smoothPath.length < maxSmoothPathPoints) {
    // Find location to steer towards
    const steerTarget = getSteerTarget(
      navMeshQuery,
      iterPos,
      targetPos,
      slop,
      polys
    );

    if (!steerTarget.success) {
      break;
    }

    const isEndOfPath =
      steerTarget.steerPosFlag & Detour.DT_STRAIGHTPATH_END;

    const isOffMeshConnection =
      steerTarget.steerPosFlag & Detour.DT_STRAIGHTPATH_OFFMESH_CONNECTION;

    // Find movement delta.
    const steerPos = steerTarget.steerPos;

    const delta = _delta.copy(steerPos).sub(iterPos);

    let len = Math.sqrt(delta.dot(delta));

    // If the steer target is the end of the path or an off-mesh connection, do not move past the location.
    if ((isEndOfPath || isOffMeshConnection) && len < stepSize) {
      len = 1;
    } else {
      len = stepSize / len;
    }

    const moveTarget = _moveTarget.copy(iterPos).addScaledVector(delta, len);

    // Move
    const moveAlongSurface = navMeshQuery.moveAlongSurface(
      polys[0],
      iterPos,
      moveTarget,
      { filter, maxVisitedSize: 16 }
    );

    if (!moveAlongSurface.success) {
      break;
    }

    const result = moveAlongSurface.resultPosition;

    fixupCorridor(polys, maxPathPolys, moveAlongSurface.visited);
    fixupShortcuts(polys, navMesh);

    const polyHeightResult = navMeshQuery.getPolyHeight(polys[0], result);

    if (polyHeightResult.success) {
      result.y = polyHeightResult.height;
    }

    iterPos.copy(result);

    // Handle end of path and off-mesh links when close enough
    if (isEndOfPath && inRange(iterPos, steerTarget.steerPos, slop, 1.0)) {
      // Reached end of path
      iterPos.copy(targetPos);

      if (smoothPath.length < maxSmoothPathPoints) {
        smoothPath.push(new THREE.Vector3(iterPos.x, iterPos.y, iterPos.z));
      }

      break;
    } else if (
      isOffMeshConnection &&
      inRange(iterPos, steerTarget.steerPos, slop, 1.0)
    ) {
      // Reached off-mesh connection.

      // Advance the path up to and over the off-mesh connection.
      const offMeshConRef = steerTarget.steerPosRef;

      // Advance the path up to and over the off-mesh connection.
      let prevPolyRef = 0;
      let polyRef = polys[0];

      let npos = 0;

      while (npos < polys.length && polyRef !== offMeshConRef) {
        prevPolyRef = polyRef;
        polyRef = polys[npos];
        npos++;
      }

      for (let i = npos; i < polys.length; i++) {
        polys[i - npos] = polys[i];
      }
      polys.splice(npos, polys.length - npos);

      // Handle the connection
      const offMeshConnectionPolyEndPoints =
        navMesh.getOffMeshConnectionPolyEndPoints(prevPolyRef, polyRef);

      if (offMeshConnectionPolyEndPoints.success) {
        if (smoothPath.length < maxSmoothPathPoints) {
          smoothPath.push(new THREE.Vector3(iterPos.x, iterPos.y, iterPos.z));

          // Hack to make the dotted path not visible during off-mesh connection.
          if (smoothPath.length & 1) {
            smoothPath.push(new THREE.Vector3(iterPos.x, iterPos.y, iterPos.z));
          }

          // Move position at the other side of the off-mesh link.
          iterPos.copy(offMeshConnectionPolyEndPoints.end);

          const endPositionPolyHeight = navMeshQuery.getPolyHeight(
            polys[0],
            iterPos
          );

          if (endPositionPolyHeight.success) {
            iterPos.y = endPositionPolyHeight.height;
          }
        }
      }
    }

    // Store results.
    if (smoothPath.length < maxSmoothPathPoints) {
      smoothPath.push(new THREE.Vector3(iterPos.x, iterPos.y, iterPos.z));
    }
  }

  return {
    success: true,
    path: smoothPath,
  };
}
function getSteerTarget(
  navMeshQuery,
  start,
  end,
  minTargetDist,
  pathPolys
) {
  const maxSteerPoints = 3;

  const straightPath = navMeshQuery.findStraightPath(start, end, pathPolys, {
    maxStraightPathPoints: maxSteerPoints,
  });

  if (!straightPath.success) {
    return {
      success: false,
    };
  }

  const outPoints = [];
  for (let i = 0; i < straightPath.straightPathCount; i++) {
    const point = new THREE.Vector3(
      straightPath.straightPath.get(i * 3),
      straightPath.straightPath.get(i * 3 + 1),
      straightPath.straightPath.get(i * 3 + 2)
    );

    outPoints.push(point);
  }

  // Find vertex far enough to steer to
  let ns = 0;
  while (ns < outPoints.length) {
    // Stop at Off-Mesh link or when point is further than slop away
    if (
      straightPath.straightPathFlags.get(ns) &
      Detour.DT_STRAIGHTPATH_OFFMESH_CONNECTION
    ) {
      break;
    }

    const posA = outPoints[ns];
    const posB = start;

    if (!inRange(posA, posB, minTargetDist, 1000.0)) {
      break;
    }

    ns++;
  }

  // Failed to find good point to steer to
  if (ns >= straightPath.straightPathCount) {
    return {
      success: false,
    };
  }

  const steerPos = outPoints[ns];
  const steerPosFlag = straightPath.straightPathFlags.get(ns);
  const steerPosRef = straightPath.straightPathRefs.get(ns);

  return {
    success: true,
    steerPos,
    steerPosFlag,
    steerPosRef,
    points: outPoints,
  };
}

function inRange(a, b, r, h) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return dx * dx + dz * dz < r && Math.abs(dy) < h;
}

function fixupCorridor(
  pathPolys,
  maxPath,
  visitedPolyRefs
) {
  let furthestPath = -1;
  let furthestVisited = -1;

  // Find furthest common polygon.
  for (let i = pathPolys.length - 1; i >= 0; i--) {
    let found = false;
    for (let j = visitedPolyRefs.length - 1; j >= 0; j--) {
      if (pathPolys[i] === visitedPolyRefs[j]) {
        furthestPath = i;
        furthestVisited = j;
        found = true;
      }
    }
    if (found) {
      break;
    }
  }

  // If no intersection found just return current path.
  if (furthestPath === -1 || furthestVisited === -1) {
    return pathPolys;
  }

  // Concatenate paths.

  // Adjust beginning of the buffer to include the visited.
  const req = visitedPolyRefs.length - furthestVisited;
  const orig = Math.min(furthestPath + 1, pathPolys.length);

  let size = Math.max(0, pathPolys.length - orig);

  if (req + size > maxPath) {
    size = maxPath - req;
  }
  if (size) {
    pathPolys.splice(req, size, ...pathPolys.slice(orig, orig + size));
  }

  // Store visited
  for (let i = 0; i < req; i++) {
    pathPolys[i] = visitedPolyRefs[visitedPolyRefs.length - (1 + i)];
  }
}

const DT_NULL_LINK = 0xffffffff;

function fixupShortcuts(pathPolys, navMesh) {
  if (pathPolys.length < 3) {
    return;
  }

  // Get connected polygons
  const maxNeis = 16;
  let nneis = 0;
  const neis = [];

  const tileAndPoly = navMesh.getTileAndPolyByRef(pathPolys[0]);

  if (!tileAndPoly.success) {
    return;
  }

  const poly = tileAndPoly.poly;
  const tile = tileAndPoly.tile;
  for (
    let k = poly.firstLink();
    k !== Detour.DT_NULL_LINK;
    k = tile.links(k).next()
  ) {
    const link = tile.links(k);

    if (link.ref() !== 0) {
      if (nneis < maxNeis) {
        neis.push(link.ref());
        nneis++;
      }
    }
  }

  // If any of the neighbour polygons is within the next few polygons
  // in the path, short cut to that polygon directly.
  const maxLookAhead = 6;
  let cut = 0;
  for (
    let i = Math.min(maxLookAhead, pathPolys.length) - 1;
    i > 1 && cut === 0;
    i--
  ) {
    for (let j = 0; j < nneis; j++) {
      if (pathPolys[i] === neis[j]) {
        cut = i;
        break;
      }
    }
  }

  if (cut > 1) {
    pathPolys.splice(1, cut - 1);
  }
}
