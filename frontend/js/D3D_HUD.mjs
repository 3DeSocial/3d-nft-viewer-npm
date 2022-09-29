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
        this.hudMat = new THREE.SpriteMaterial( { map: this.hudTexture } );

        this.HUDplane =  new THREE.Sprite( this.hudMat );
    //    this.HUDplane.renderOrder = 9999;         
        this.hudMat.needsUpdate = true;

    }

    initHUDCamera = () =>{
        // Create the camera and set the viewport to match the screen dimensions.
        this.cameraHUD = new THREE.OrthographicCamera(-this.hudMat.map.image.width, this.hudMat.map.image.width, this.hudMat.map.image.width, -this.hudMat.map.image.width, 0, 30 );
                const width = this.hudMat.map.image.width;
                const height = this.hudMat.map.image.width;

        // Create also a custom scene for HUD.
        this.sceneHUD = new THREE.Scene();
                this.HUDplane.scale.set( width, height, 1 );        
        this.sceneHUD.add(this.HUDplane);
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