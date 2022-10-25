import * as THREE from 'three';
export default class AudioClip {

    //interface for deso api based on passed config
    constructor(config){

        let defaults = {
              
        };
    
        this.config = {
            ...defaults,
            ...config
        };

        this.path = this.config.path;
        this.listener = new THREE.AudioListener();
        this.camera = this.config.camera;
        this.camera.add( this.listener );
        this.sound = new THREE.PositionalAudio( this.listener );
        this.mesh = this.config.mesh;
        this.loadSound()
        
    }


    loadSound = () =>{
        let that = this;
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load( this.path, function( buffer ) {
            that.sound.setBuffer( buffer );
            that.sound.setRefDistance( 20 );
            that.attatchTo(that.mesh);
        })

    }

    play = () =>{
        if(!this.listener.isPlaying){
            this.sound.play();
        }        

    }

    stop = () =>{
        if(this.sound.source){
            this.sound.stop();
        }
    }    

    attatchTo  = (mesh) =>{
        mesh.add(this.sound);
    }
}
export {AudioClip}