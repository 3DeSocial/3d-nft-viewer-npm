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
        this.width = window.innerWidth;
        this.height = window.innerHeight;
     
    }

    init = () =>{
    
        this.initSourceDiv();
        this.initHUDCanvas();
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

    updateHUD = (blob) =>{
        this.initHUDObject(blob);
        console.log('upate performed')
    }

    initHUDCanvas = () =>{



        this.hudCanvas = document.createElement('canvas');
        this.hudCanvas.width = this.width;
        this.hudCanvas.height = this.height;
        // Get 2D context and draw something supercool.
        var hudBitmap = this.hudCanvas.getContext('2d');
            hudBitmap.font = "Normal 40px Arial";
            hudBitmap.textAlign = 'center';
            hudBitmap.fillStyle = "rgba(245,245,245,0.75)";
            hudBitmap.fillText(this.config.defaultContent, this.width / 2, this.height / 2);

        this.hudBitmap = hudBitmap;
    }

    initHUDObject = (blob) =>{
        this.hudTexture = null;
        // Create texture from rendered graphics.
        this.hudTexture = new THREE.Texture(blob) 
        this.hudTexture.needsUpdate = true;
        let dataUrl = URL.createObjectURL(blob);
        let imgWidth, imgHeight;
        var image = new Image();
        image.src = dataUrl;
        image.onload = function() { 

            that.hudTexture.image = image; 
            that.hudTexture.needsUpdate = true; 

            // Create HUD material.
            var material = new THREE.MeshBasicMaterial( {
                map: this.hudTexture,
                depthTest: false,
                transparent: true,
                opacity: 0.5} );

            // Create plane to render the HUD. This plane fill the whole screen.
            var planeGeometry = new THREE.PlaneGeometry( this.width, this.height );
            this.HUDplane = new THREE.Mesh( planeGeometry, material );
            this.HUDplane.renderOrder = 9999;         
        };
     
    }

    initHUDCamera = () =>{
        // Create the camera and set the viewport to match the screen dimensions.
        this.cameraHUD = new THREE.OrthographicCamera(-this.width/2, this.width/2, this.height/2, -this.height/2, 0, 1000 );

        // Create also a custom scene for HUD.
        this.sceneHUD = new THREE.Scene();
        this.sceneHUD.add(this.HUDplane);
    }

    show = () =>{

    }

    hide = () =>{

    }   

    update = (message)  =>{
        this.hudTexture.needsUpdate = true;
        this.hudBitmap.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
        this.hudBitmap.fillText(message, this.width / 2, this.height / 2);

    }

    render = () =>{
        this.renderer.clearDepth();
        this.renderer.render(this.sceneHUD,this.cameraHUD);
    }
}
export {HUD}