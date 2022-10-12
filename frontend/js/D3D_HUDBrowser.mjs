import * as THREE from 'three';
import domtoimage from 'dom-to-image';

export default class HUDBrowser  {

    constructor(config) {

        let defaults = {
            renderer: null,
            defaultContent: 'Initializing...',
        };
    
        this.config = {
            ...defaults,
            ...config
        };
     
     
    }

    init = () =>{
    
        this.initSourceDiv();

    }

    initSourceDiv = () =>{
        let that = this;

        this.sourceDiv = document.querySelector('#hud-content');
        if(!this.sourceDiv){
            this.createSourceDiv();
        }
        this.closeBtn = document.querySelector('#close-hud');

        
       this.closeBtn.addEventListener('click',(e)=>{
            that.hide();
        });
    }

    createSourceDiv =()=>{
        newEl = document.createElement('div');
        newEl.setAttribute("id", "hud-content");
        newEl.setAttribute("class", "hud-content");
        newEl.setAttribute("style", "display: none;");
        document.body.appendChild(newEl);
        this.sourceDiv = newEl;

    };

    show = (msg) =>{
        if(msg){
            this.updateOverlayMsg(msg);
        };
        this.sourceDiv.style.display = 'inline-block';
        this.sourceDiv.classList.add('.show-hud');

    }

    hide = () =>{
        this.sourceDiv.style.display = 'none';
    }   

    clear = () =>{
        this.updateOverlayMsg('');
    }

    updateOverlayMsg = (msg) =>{
        document.querySelector('#hud-text').innerHTML = msg;
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
export {HUDBrowser}