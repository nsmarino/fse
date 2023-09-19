import sanityClient from "../sanityClient"
import {writable} from "svelte/store"
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {get} from "svelte/store"
import yoshuaHaystack from "../../assets/npcs/yoshua_haystack.gltf"
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { acceleratedRaycast } from 'three-mesh-bvh';
import gsap from "gsap"

THREE.Mesh.prototype.raycast = acceleratedRaycast;

import Enemy from "../Components/Game/NonPlayer/Enemy";

import Interaction from "../Components/Game/NonPlayer/Interaction";

// import Fountain from "../Components/Game/NonPlayer/Fountain";
import ItemOnMap from "../Components/Game/NonPlayer/ItemOnMap";
import Gateway from "../Components/Game/NonPlayer/Gateway";
import Connection from "../Components/Game/NonPlayer/Connection";

import Collider from "../Components/World/Collider";
import Sky from "../Components/World/Sky";
import Lights from "../Components/World/Lights";

import yoshuaAlert from "../../assets/portraits/yoshua/alert.svg"
import yoshuaHappy from "../../assets/portraits/yoshua/happy.svg"
import yoshuaSerious from "../../assets/portraits/yoshua/serious.svg"



class Loader {
    constructor() {
        this.scene = null
        this.collider = null
    }

    async loadFromCMS(useSavedGame) {
      const query = `*[_type == "settings"]{
        "mesh": mesh.asset->url,
      }`
      const response = await sanityClient.fetch(query)
      Avern.Content.baseFile = response[0].mesh

      // 'content' should only be interested in what's present the actual scene file. the Store is used to determine what actually spawns in the game
      Avern.Content = {
        baseFile: response[0].mesh,
        items:[
          {
            label: "gatehouse-key",
            item: {
              name: "Key to the Gatehouse",
              img: "",
              id: "gatehouse-key",
              category: "key",
            }
          },
          {
            label: "healing-flask",
            item: {
              name: "Healing Flask",
              category: "flask"
            }
          }
        ],
        interactions:[
          {
            label: "yoshua_haystack",
            index: 0,

            // check when scene is loaded; also check on world_state_changed signal
            // if world conditions don't all match, destroy
            worldConditions: [
              {id:"gateUnlocked", value:true}
            ],
            model: yoshuaHaystack,
            content: [
              {
                prompt: "Talk to the drowsy interloper",
                trigger: null,
                next: "readyForSwamp",
                nodes:[
                  {
                  type: "dialogue",
                  text: "Ah...is this your haystack? I couldn't resist...I have been running all night.",
                  image: yoshuaAlert,
                  label: "Drowsy interloper",
                  },
                  {
                    type: "narration",
                    image: yoshuaAlert,
                    text: "He is a curly haired and delicate adolescent, about your age. His cheeks are flushed with the cold morning air and there is a stalk of hay sticking out of his ear.",
                  },
                  {
                      type: "dialogue",
                      text: "I am in your debt...are you a castrate? That mask...it is so hard to know if you are angry!",
                      image: yoshuaAlert,
                      label: "Drowsy interloper",
                  },
                  {
                      type: "dialogue",
                      text: "Forgive me! I mean no offense. I am very tired. I was captured by slavers...",
                      image: yoshuaHappy,
                      label: "Drowsy interloper",
                  },
                  {
                      type: "dialogue",
                      text: "I am Yoshua. I come from the capital. I was taken there -- along with my sister.",
                      image: yoshuaHappy,
                      label: "Yoshua, fugitive",
                  },
                  {
                    type: "narration",
                    text: "He frowns and glances downward. His strange cheeriness melts away.",
                    image: yoshuaSerious,
                  },
                  {
                      type: "dialogue",
                      text: "My sister...they still have her. In a palanquin, deep in the swamp. Would you help me, castrate? I am at your mercy.",
                      image: yoshuaSerious,
                      label: "Yoshua, fugitive",
                      trigger: "help_yoshua"
                  },
                  {
                    type: "dialogue",
                    text: "I have little I can offer you...I stole this dagger when I fled. Perhaps you are more skilled with it than I.",
                    image: yoshuaSerious,
                    label: "Yoshua, fugitive",
                  },
                  {
                      type: "item",
                      text: "You have received [Ceremonial Dagger].",
                      item: "ceremonial_dagger"
                  },
                ]
              },
              {
                prompt: "Talk to Yoshua",
                trigger: null,
                next: null,
                nodes: [
                  {
                    type: "dialogue",
                    text: "I'm so happy you will help me! Let's make for the swamp...the slavers have their camp there. That is where my sister is imprisoned.",
                    image: yoshuaHappy,
                    label: "Yoshua, fugitive",
                  }
                ]
              },
            ],
          }
        ],
        enemies:[

        ],
        gates:[
          {
            label: "gatehouse-door",
            prompt: "Open rear door of gatehouse",
            unlockedBy: "gatehouse-key"
          }
        ],
      }

      this.newGameStore = {
        scene: "url",

        // just an array of IDs so the engine knows not to load them; cleared every time a scene is changed
        killedEnemies:[],
    
        player: { 
            flasks: 5,
            hp: 100,
            level: 10,
            xp: 0,
            location: null,
        },
    
        pauseMenu: false,
        characterMenu: false,
    
        worldEvents: {
          // these will be checked against for interactions etc
            gateUnlocked: false,
            esthelSaved: false,
        },
    
        ongoingInteractions: {},
          // save index of various interactions
          // "yoshua_haystack": 1
    
        prompt: "",
        
        interaction: {
            active: false,
            node: {}
        },
    
        config: {
            leftHanded: true,
        },
    
        weapons: [
            {
                name: "Goatherd's Rifle",
                img: "",
                description: "",
                primary: "",
                actions: [
                  {
                    id: "shoot_from_distance",
                    label: "Shoot from a distance",
                    caption: "Loading rifle",
                    description: ".",
                    primeLength: 1,
                    baseDamage: 25,
                    range: 15,
                    primed: false,
                    input: "KeyF",
                    indicator: "F",
                    requiresTarget: true,
                    primeAnimation: "load",
                    animation: "shoot",
                  },
                  {
                    id: "bayonet_slash",
                    label: "Slash with bayonet",
                    description: "",
                    caption: "Affixing bayonet",
                    primeLength: 0.6,
                    cooldown: 0,
                    baseDamage: 10,
                    range: 5,
                    primed: false,
                    input: "KeyD",
                    indicator: "D",
                    requiresTarget: false,
                    primeAnimation: "load",
                    animation: "slash"
                  },
                  {
                    id: "shoot_from_distance",
                    label: "Shoot from a distance",
                    caption: "Loading rifle",
                    description: ".",
                    primeLength: 1,
                    baseDamage: 25,
                    range: 15,
                    primed: false,
                    input: "KeyF",
                    indicator: "F",
                    requiresTarget: true,
                    primeAnimation: "load",
                    animation: "shoot",
                  },
                  {
                    id: "bayonet_slash",
                    label: "Slash with bayonet",
                    description: "",
                    caption: "Affixing bayonet",
                    primeLength: 0.6,
                    cooldown: 0,
                    baseDamage: 10,
                    range: 5,
                    primed: false,
                    input: "KeyD",
                    indicator: "D",
                    requiresTarget: false,
                    primeAnimation: "load",
                    animation: "slash"
                  },
                ]
            },
            {
                name: "Explosives Kit",
                img: "",
                description: "",
                primary: "",
                actions: [
                  {
                    id: "shoot_from_distance",
                    label: "Shoot from a distance",
                    caption: "Loading rifle",
                    description: ".",
                    primeLength: 1,
                    baseDamage: 25,
                    range: 15,
                    primed: false,
                    input: "KeyF",
                    indicator: "F",
                    requiresTarget: true,
                    primeAnimation: "load",
                    animation: "shoot",
                  },
                  {
                    id: "bayonet_slash",
                    label: "Slash with bayonet",
                    description: "",
                    caption: "Affixing bayonet",
                    primeLength: 0.6,
                    cooldown: 0,
                    baseDamage: 10,
                    range: 5,
                    primed: false,
                    input: "KeyD",
                    indicator: "D",
                    requiresTarget: false,
                    primeAnimation: "load",
                    animation: "slash"
                  },
                  {
                    id: "shoot_from_distance",
                    label: "Shoot from a distance",
                    caption: "Loading rifle",
                    description: ".",
                    primeLength: 1,
                    baseDamage: 25,
                    range: 15,
                    primed: false,
                    input: "KeyF",
                    indicator: "F",
                    requiresTarget: true,
                    primeAnimation: "load",
                    animation: "shoot",
                  },
                  {
                    id: "bayonet_slash",
                    label: "Slash with bayonet",
                    description: "",
                    caption: "Affixing bayonet",
                    primeLength: 0.6,
                    cooldown: 0,
                    baseDamage: 10,
                    range: 5,
                    primed: false,
                    input: "KeyD",
                    indicator: "D",
                    requiresTarget: false,
                    primeAnimation: "load",
                    animation: "slash"
                  },
                ]
            },
            {
                name: "Ceremonial Dagger",
                img: "",
                description: "",
                primary: "",
                actions: [
                  {
                    id: "shoot_from_distance",
                    label: "Shoot from a distance",
                    caption: "Loading rifle",
                    description: ".",
                    primeLength: 1,
                    baseDamage: 25,
                    range: 15,
                    primed: false,
                    input: "KeyF",
                    indicator: "F",
                    requiresTarget: true,
                    primeAnimation: "load",
                    animation: "shoot",
                  },
                  {
                    id: "bayonet_slash",
                    label: "Slash with bayonet",
                    description: "",
                    caption: "Affixing bayonet",
                    primeLength: 0.6,
                    cooldown: 0,
                    baseDamage: 10,
                    range: 5,
                    primed: false,
                    input: "KeyD",
                    indicator: "D",
                    requiresTarget: false,
                    primeAnimation: "load",
                    animation: "slash"
                  },
                  {
                    id: "shoot_from_distance",
                    label: "Shoot from a distance",
                    caption: "Loading rifle",
                    description: ".",
                    primeLength: 1,
                    baseDamage: 25,
                    range: 15,
                    primed: false,
                    input: "KeyF",
                    indicator: "F",
                    requiresTarget: true,
                    primeAnimation: "load",
                    animation: "shoot",
                  },
                  {
                    id: "bayonet_slash",
                    label: "Slash with bayonet",
                    description: "",
                    caption: "Affixing bayonet",
                    primeLength: 0.6,
                    cooldown: 0,
                    baseDamage: 10,
                    range: 5,
                    primed: false,
                    input: "KeyD",
                    indicator: "D",
                    requiresTarget: false,
                    primeAnimation: "load",
                    animation: "slash"
                  },
                ]
            },
        ],
    
        items: [
    
        ],
    
        actions: [
            {
                id: "shoot_from_distance",
                label: "Shoot from a distance",
                caption: "Loading rifle",
                description: ".",
                primeLength: 1,
                baseDamage: 25,
                range: 15,
                primed: false,
                input: "KeyF",
                indicator: "F",
                requiresTarget: true,
                primeAnimation: "load",
                animation: "shoot",
            },
            {
                id: "bayonet_slash",
                label: "Slash with bayonet",
                description: "",
                caption: "Affixing bayonet",
                primeLength: 0.6,
                cooldown: 0,
                baseDamage: 10,
                range: 5,
                primed: false,
                input: "KeyD",
                indicator: "D",
                requiresTarget: false,
                primeAnimation: "load",
                animation: "slash"
            },
            {
                id: "set_land_mine",
                label: "Set Landmine",
                locked: true,
                primeLength: 3,
                cooldown: 0,
                baseDamage: 40,
                range: 3,
                primed: false,
                input: "KeyS",
                indicator: "S",
                requiresTarget: false,
                primeAnimation: "plant",
                animation: "detonate",
            },
            {
                id: "blast_at_close_range",
                label: "Blast at close range",
                description: ".",
                primeLength: 2.5,
                baseDamage: 2,
                locked: true,
                range: 20,
                primed: false,
                input: "KeyA",
                indicator: "A",
                requiresTarget: true,
                primeAnimation: "loadShotgun",
                animation: "shotgun",
            },
            ]
        ,
    
        // simple array of interactions and notices
        log: [],
    
        tutorials: [
            {
                label: "openingRemarks",
                shown: false,
            },
            {
                label: "weapons",
                shown: false,
            },
        ]
      }
      const store = useSavedGame ? JSON.parse(localStorage.getItem("AvernStore")) : this.newGameStore
      for (const [key, value] of Object.entries(store)) {
        Avern.Store[key] = writable(value)
      }
      Avern.Store.pauseMenu.set(false)
    }

    async initScene(id=null) {
      const scene = new THREE.Scene();
      scene.name = id ? id : "Start"
      Avern.State.scene = scene
      
      const sky = Avern.GameObjects.createGameObject(scene, "sky")
      sky.addComponent(Sky)

      const lights = Avern.GameObjects.createGameObject(scene, "lights")
      lights.addComponent(Lights)

      if (Avern.Content.baseFile) {
        const res = await new GLTFLoader().loadAsync(Avern.Content.baseFile)
        const gltfScene = res.scene;
        gltfScene.updateMatrixWorld( true );
        this.initNavmeshFromBaseFile(gltfScene,scene)
        const collider = Avern.GameObjects.createGameObject(scene, "collider")
        collider.addComponent(Collider, gltfScene)
  
        this.initNonPlayerFromBaseFile(gltfScene,scene)
      }

      if (Avern.Config.player.include) this.initPlayer(scene)
      if (Avern.Config.interface.include) this.initInterface(scene)
      if(Avern.renderPaused) Avern.renderPaused=false
    }

    initNavmeshFromBaseFile(baseFile, scene) {
      const navmesh = baseFile.children.filter(child=> child.isMesh && child.userData.gltfExtensions.EXT_collections.collections[0]==="navmesh")[0]
      if (!navmesh) return;
      Avern.pathfindingZone = baseFile.name
      Avern.PATHFINDING.setZoneData(Avern.pathfindingZone, Pathfinding.createZone(navmesh.geometry));
      // visualize:
      // for (const vert of Avern.PATHFINDING.zones[baseFile.name].vertices) {
      //     const indicatorSize = 0.1 
      //     const geometry = new THREE.BoxGeometry( indicatorSize,indicatorSize,indicatorSize); 
      //     const material = new THREE.MeshBasicMaterial( {color: 0x000000} ); 
      //     const cube = new THREE.Mesh( geometry, material ); 
      //     cube.position.copy(vert)
      //     scene.add( cube );
      // }
      navmesh.visible = false
      scene.add(navmesh)
    }

    initNonPlayerFromBaseFile(baseFile, scene) {
      const currentWorldEvents = get(Avern.Store.worldEvents)

      baseFile.traverse(c => {
        if (c.userData.gltfExtensions?.EXT_collections?.collections) {
          switch(c.userData.gltfExtensions.EXT_collections.collections[0]) {
            case "enemies":
              // get content
              // check store
              // if enemy killed (this array is emptied on every rest and scene swap) or worldEventX, return

              const enemy = Avern.GameObjects.createGameObject(scene, c.name)                        
              enemy.addComponent(Enemy, c)
              break;

            case "fountains":
              // const fountain = Avern.GameObjects.createGameObject(scene, c.name)                        
              // fountain.addComponent(Fountain, c)
              break;

            case "to":
              const connection = Avern.GameObjects.createGameObject(scene, c.name)                        
              connection.addComponent(Connection, c)
              break;

            case "interactions":
              // get content
              const interactionContent = Avern.Content.interactions.find(int => int.label === c.userData.label)
              if (interactionContent) {
                // check store. if interaction's conditions are not met, return
                let shouldSpawnInteraction = true
                for (const condition of interactionContent.worldConditions) {
                  if(currentWorldEvents[condition.id]!==condition.value) shouldSpawnInteraction = false
                }

                if (shouldSpawnInteraction) {
                  const interaction = Avern.GameObjects.createGameObject(scene, c.name)
                  interaction.addComponent(Interaction, c, interactionContent)
                }                
              }
              break;

            case "items":
              // get content
              const itemContent = Avern.Content.items.find(i => i.label === c.userData.label)
              // check store
              // if item is already in Store.items, return
              const currentItems = get(Avern.Store.items)

              if (itemContent) {
                let shouldSpawnItem = true
                if (currentItems.find(i => i.id===itemContent.label)) shouldSpawnItem = false

                if (shouldSpawnItem) {
                  const itemOnMap = Avern.GameObjects.createGameObject(scene, c.name)
                  itemOnMap.addComponent(ItemOnMap, c, itemContent)
                }                
              }

              break;

            case "doors":
              // get content
              const gateContent = Avern.Content.gates.find(g => g.label === c.userData.label)
              // check store
              // if worldEvent[this gate was unlocked], spawn in unlocked state
              if (!currentWorldEvents.gateUnlocked) {
                const gateway = Avern.GameObjects.createGameObject(scene, c.name)
                gateway.addComponent(Gateway, c, gateContent)
              }
              break;

            default:
              break;
          }
        }
      });
    }

    initPlayer(scene) {
      const player = Avern.GameObjects.createGameObject(scene, "player")
      Avern.Player = player
      for (const component of Avern.Config.player.components) {
          player.addComponent(component)
      }
    }

    initInterface(scene) {
      const gameInterface = Avern.GameObjects.createGameObject(scene, "interface")
      Avern.Interface = gameInterface
      for (const component of Avern.Config.interface.components) {
          gameInterface.addComponent(component)
      }
    }

    clearScene() {

    }

    async switchScene(url){
      gsap.to(".mask", { opacity: 0, duration: 2})
      gsap.to(".mask svg", { opacity: 0, duration: 2})
      gsap.to(".mask p", { opacity: 0, duration: 2})
      Avern.GameObjects.removeAllGameObjects()
      Avern.Content.baseFile=url

      await this.initScene()
      Avern.GameObjects.attachObservers() // Listen for signals from other gameObjects' components.

    }

    // add interaction to scene if condition has been met.
    addToScene(){}
}

export default Loader