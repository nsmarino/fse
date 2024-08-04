import * as THREE from 'three';
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh'
import GameplayComponent from '../_Component';
import Body from '../Game/Player/Body';
import { init } from 'recast-navigation';
import { threeToSoloNavMesh, NavMeshHelper } from 'recast-navigation/three';

class Collider extends GameplayComponent {
    constructor(gameObject, scene) {
        super(gameObject)

        const geometryMeshes = scene.children.filter(child=> child.isMesh && (child.userData.gltfExtensions.EXT_collections.collections[0]==="background" || child.userData.gltfExtensions.EXT_collections.collections[0]==="foreground"))    
        if (geometryMeshes.length===0) return;
  
        let environment = new THREE.Group();
        environment.name = "environment"
  
        const levelGeometry = new THREE.Scene()
        for (const mesh of geometryMeshes) {
            mesh.receiveShadow = true
            if (mesh.name !== 'Ground') mesh.material.side = THREE.FrontSide
            levelGeometry.add(mesh)
        }
        environment = levelGeometry
        environment.updateMatrixWorld( true );
        const staticGenerator = new StaticGeometryGenerator( environment );
        staticGenerator.attributes = [ 'position' ];
        const mergedGeometry = staticGenerator.generate();
        mergedGeometry.boundsTree = new MeshBVH( mergedGeometry );
        this.collider = new THREE.Mesh( mergedGeometry );
        this.collider.name = "worldCollider"
        this.collider.material.wireframe = true;
        this.collider.material.opacity = 1;
        this.collider.visible = false; // collider is the ... collision

        gameObject.transform.parent.add( this.collider );
        gameObject.transform.parent.add( environment );

        Avern.State.env = environment
        this.collider.layers.set(1)
        Avern.State.collider = this.collider

        const initRecast = async () => {
            await init()
            console.log("Geometry meshes provided:", geometryMeshes  )
            const { success, navMesh } = threeToSoloNavMesh(geometryMeshes, {})
            Avern.navMesh = navMesh
            // this.navMeshHelper = new NavMeshHelper({ navMesh });
            // gameObject.transform.parent.add( this.navMeshHelper );
        }

        initRecast()
    }

    update(deltaTime) {
        // if (this.navMeshHelper) this.navMeshHelper.update()
        if (!Avern.State.worldUpdateLocked && Avern.Player) {
            const physicsSteps = Avern.Config.world.physicsSteps;
            for ( let i = 0; i < physicsSteps; i ++ ) {
                this.emitSignal("world_collide", { collider: this.collider, delta: deltaTime/physicsSteps })
            }
        }
    }
    checkWorldCollision(){}

    onSignal(signalName, data={}) {
        switch(signalName) {
          case "example_signal":
            console.log("Example signal", data)
            break;
        }
    }
    
    attachObservers(parent) {
        if (Avern.Player) this.addObserver(Avern.Player.getComponent(Body))
    }
}

export default Collider