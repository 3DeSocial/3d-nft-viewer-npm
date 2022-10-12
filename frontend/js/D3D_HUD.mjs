import * as THREE from 'three';
import domtoimage from 'dom-to-image';

export default class HUD  {

    constructor(config) {

        let defaults = {
            renderer: null,
            defaultContent: 'Initializing...',
            scene: null
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        this.renderer = this.config.renderer;
        this.screenDimensions =  new THREE.Vector4();
        this.renderer.getViewport(this.screenDimensions);
        this.width = this.screenDimensions.z;//window.innerWidth;
        this.height = this.screenDimensions.w;//window.innerHeight;
        console.log('this.screenDimensions',this.screenDimensions);
        this.scene = this.config.scene;
        this.hudPos = new THREE.Vector3();
        this.camera =this.config.camera;
        this.player = this.config.player;
     
    }

    init = () =>{
    
        this.initSourceDiv();
        this.initHUDObject();


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

     initHUDObject = () =>{
        let that = this;
        this.hudMat = null;
        this.hudTexture = null;

        domtoimage.toPng(document.querySelector("#hud-content")).then(function (dataUrl) {
            var imageElement = document.createElement('img');
                imageElement.onload = function(e) {
                    let textureLoader = new THREE.TextureLoader()
                    that.hudTexture = textureLoader.load(this.src);

                    // Create HUD material.
                     that.hudMat = new THREE.MeshBasicMaterial( {
                        map: that.hudTexture,
                        transparent: false,
                        opacity: 0.75});

                     const geometry = new THREE.BoxGeometry(this.width, this.height, 0.01);
                    that.HUDplane = new THREE.Mesh( geometry, that.hudMat );
that.HUDplane.scale.set(0.01,0.01,0.01);
                that.HUDplane.material.needsUpdate = true;
           //     that.HUDplane.position.set(-1000,-1000,-1000);
                that.player.add(that.HUDplane);
            };

            imageElement.src = dataUrl;

        });

    }


 /*   initHUDObject = () =>{
        // Create texture from rendered graphics.
        this.hudTexture = new THREE.Texture(this.hudCanvas) 
        this.hudTexture.needsUpdate = true;
        this.hudMat = new THREE.SpriteMaterial( { map: this.hudTexture } );

        this.HUDplane =  new THREE.Sprite( this.hudMat );
         //this.HUDplane.center.set(1,1);
    //    this.HUDplane.renderOrder = 9999;         
        this.hudMat.needsUpdate = true;

    }*/

    

    onWindowResize = ()=> {
        console.log("reszing");

        this.renderer.getViewport(this.screenDimensions);
        this.width = this.screenDimensions.z;//window.innerWidth;
        this.height = this.screenDimensions.w;//window.innerHeight;
   //     this.HUDplane.scale.set( this.width, this.height, 1 );     

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

    updateOverlayMsg = (msg, pos) =>{
        document.querySelector('#hud-content').innerHTML = msg;    
        let that = this;
        if(pos){

        } else {
            console.log('no position');
        };
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
export {HUD}