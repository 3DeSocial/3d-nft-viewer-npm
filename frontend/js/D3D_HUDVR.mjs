import * as THREE from 'three';
import domtoimage from 'dom-to-image';

export default class HUDVR  {

    constructor(config) {

        let defaults = {
            renderer: null,
            defaultContent: 'Initializing...',
        };
    
        this.config = {
            ...defaults,
            ...config
        };
   /*    this.renderer = this.config.renderer;
        this.screenDimensions =  new THREE.Vector4();
        this.renderer.getViewport(this.screenDimensions);
        this.width = this.screenDimensions.z;//window.innerWidth;
        this.height = this.screenDimensions.w;//window.innerHeight;
        console.log('this.screenDimensions',this.screenDimensions);
     */
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
         //this.HUDplane.center.set(1,1);
    //    this.HUDplane.renderOrder = 9999;         
        this.hudMat.needsUpdate = true;

    }

    initHUDCamera = () =>{
        // Create the camera and set the viewport to match the screen dimensions.
        this.cameraHUD = new THREE.OrthographicCamera(-this.width, this.width, this.height, -this.height, 0, 100 );
                const width = this.hudMat.map.image.width;
                const height = this.hudMat.map.image.width;
        // Create also a custom scene for HUD.
        this.sceneHUD = new THREE.Scene();
        this.HUDplane.scale.set( this.width, this.height, 1 );     
        let ypos = (this.height/2);
        let xpos = -(this.width/2);
        console.log(xpos,ypos);
        this.HUDplane.position.set(xpos,ypos);  

        this.sceneHUD.add(this.HUDplane);
        this.render();
    }

    onWindowResize = ()=> {
        console.log("reszing");

        this.renderer.getViewport(this.screenDimensions);
        this.width = this.screenDimensions.z;//window.innerWidth;
        this.height = this.screenDimensions.w;//window.innerHeight;
        this.HUDplane.scale.set( this.width, this.height, 1 );     

      /*  const newAspect = this.width/this.height;

        this.cameraHUD.left = (newAspect) / -2;
        this.cameraHUD.right = (newAspect) / 2;
        this.HUDplane.scale.set( this.width, this.height, 1 );        

        this.cameraHUD.updateProjectionMatrix();*/

    }


    show = () =>{
    }

    hide = () =>{
        this.sourceDiv.empty();
    }   

    clear = () =>{
        this.updateOverlayMsg('');
    }

    updateOverlayMsg = (msg) =>{
        document.querySelector('#hud-content').innerHTML = msg;    
        let that = this;
        domtoimage.toPng(document.querySelector("#hud-content")).then(function (dataUrl) {
            that.updateHUDTexture(dataUrl)
        });
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
export {HUDVR}