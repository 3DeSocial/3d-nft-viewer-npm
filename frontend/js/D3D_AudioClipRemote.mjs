import * as THREE from 'three';
export default class AudioClipRemote {

    //interface for deso api based on passed config
    constructor(config){

        let defaults = {
              
        };
    
        this.config = {
            ...defaults,
            ...config
        };

        this.path = this.config.path;
        this.listener = this.config.listener;
        this.sound = new THREE.PositionalAudio( this.listener );
        this.mesh = this.config.mesh;
        this.loadSound()
        
    }


    loadSound = () =>{
        let that = this;
      /*  console.log('loadSound: ',this.path);
        fetch(this.path).then((data)=>{
            console.log('audio track recieved');
        }).catch((err)=>{
            console.log(err);
        });
*/

        //this.sound.setMediaElementSource( mediaElement );
     

    }

    play = () =>{


        console.log('mediaElement method');
        const mediaElement = new Audio( this.path );
        console.log(mediaElement);
        mediaElement.play();

        //if(!this.listener.isPlaying){
         //   this.sound.play();
        //}        

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
export {AudioClipRemote}