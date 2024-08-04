import * as THREE from 'three';

class Core {
    constructor() {
        this.clock = new THREE.Clock();

        // Set antialias to false and change pixel ratio to ~0.5 for nintendo64 feel
        this.renderer = new THREE.WebGLRenderer( { antialias: false, canvas: document.querySelector(".canvas") } );
        this.renderer.setPixelRatio( 0.9 );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.2;

        // CAVE TONEMAPPING:
        // this.renderer.toneMappingExposure = 0.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        window.addEventListener( 'resize', function () {
            this.renderer.setSize( window.innerWidth, window.innerHeight );
        }.bind(this), false );

    }
}

export default Core