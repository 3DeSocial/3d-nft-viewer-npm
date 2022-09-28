import * as THREE from 'three';

export default class HUD  {

    constructor(config) {

        let defaults = {
            renderer: null,
            defaultContent: 'Initializing...',
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        this.renderer = this.config.renderer;
        this.width = 600;//window.innerWidth;
        this.height = 300;//window.innerHeight;
     
    }

    init = () =>{
    
        this.initSourceDiv();
        this.initHUDCanvas();
        this.initHUDObject();
        this.initHUDCamera();

    }

    initSourceDiv = () =>{
        this.sourceDiv = document.querySelector('#hud-content');
        if(!this.sourceDiv){
            this.createSourceDiv();
        }
    }

    createSourceDiv =()=>{
        //document.body.append();
    }

    initHUDCanvas = () =>{

        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.width = this.width;
        this.hudCanvas.height = this.height;
        // Get 2D context and draw something supercool.
        var hudBitmap = this.hudCanvas.getContext('2d');
          

        this.hudBitmap = hudBitmap;
    }

    initHUDObject = () =>{
        // Create texture from rendered graphics.
        this.hudTexture = new THREE.Texture(this.hudCanvas) 
        this.hudTexture.needsUpdate = true;

        // Create HUD material.
        this.hudMat = new THREE.MeshBasicMaterial( {
            map: this.hudTexture,
            depthTest: false,
            transparent: true
        });

        // Create plane to render the HUD. This plane fill the whole screen.
        var planeGeometry = new THREE.PlaneGeometry( this.width, this.height );
        this.HUDplane = new THREE.Mesh( planeGeometry, this.hudMat );
        this.HUDplane.renderOrder = 9999;         
        this.hudMat.needsUpdate = true;

    }

    initHUDCamera = () =>{
        // Create the camera and set the viewport to match the screen dimensions.
        this.cameraHUD = new THREE.OrthographicCamera(-this.width, this.width, this.height, -this.height, 0, 30 );

        // Create also a custom scene for HUD.
        this.sceneHUD = new THREE.Scene();
        this.sceneHUD.add(this.HUDplane);
        this.HUDplane.position.y=-0.5;
        this.render();
    }

    show = () =>{

    }

    hide = () =>{

    }   

    updateHUDTexture = (dataUrl)  =>{
        let that = this;
        var texture;
        var imageElement = document.createElement('img');
        imageElement.onload = function(e) {
          const textureLoader = new THREE.TextureLoader()
          const texture = textureLoader.load(this.src);
          console.log('image width and height');
          console.log(this.width, this.height);
            that.HUDplane.material.map = texture;
            that.HUDplane.material.needsUpdate = true;
        };
        imageElement.src = dataUrl;
    }

    render = () =>{
        this.renderer.clearDepth();
        this.renderer.render(this.sceneHUD,this.cameraHUD);
    }
}
export {HUD}