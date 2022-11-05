import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";


export default class PlayerVR {

    constructor(config){
        let defaults = {
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts',
            castShadow: true     
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        
        this.avatar = null;
        this.camera =this.config.camera;
        this.buildDolly();
        this.dir = new THREE.Vector3();
        this.q = new THREE.Quaternion();        // rotation
        this.speed = 2;
        this.proxy = this.config.controlProxy;
        this.playerCollider = null;
        this.collisionChecker = this.config.collisionChecker;
       // this.loadModels();


    }

    hasAnimations = (obj) =>{
        if(!obj){
            obj = this.root;
        };
        if(obj.animations){
            if(obj.animations.length>0){
                this.animations = obj.animations;
                return true;
            };            
        }

        if(!obj.children){
            return false;
        }
       
        if(!obj.children[0]){
            return false;
        };

        if(obj.children[0].animations){
            if(obj.children[0].animations.length>0){
                this.animations = obj.children[0].animations;
                return true;
            };          
        };

        return false;
    }

    buildDolly = () =>{

        this.dolly = new THREE.Object3D();
        this.camera.position.set( 0, 1.6, 0 );
        this.camera.rotation.set(0,0,0);
        this.dolly = new THREE.Object3D(  );
        this.dolly.position.copy(this.config.playerStartPos);
        this.dolly.add( this.camera );
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );       
        this.playerCollider = this.buildPlayerCollider();
        this.dolly.add(this.playerCollider);

    }

    buildPlayerCollider = () =>{
        let pColl = new THREE.Mesh(
            new RoundedBoxGeometry(  1.0, 1.0, 1.0, 10, 0.5),
            new THREE.MeshStandardMaterial({ transparent: false, opacity: 0})
        );

        pColl.translate( 0, -1, 0 );
        pColl.capsuleInfo = {
            radius: 0.5,
            segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
        };
        return pColl;
    }

    moveDolly = (delta) =>{
        if(!this.dolly){
            console.log('no dolly');
            return false;
        };
        if(this.proxy.dir === 'f'){
            const quaternion = this.dolly.quaternion.clone();   
            //Get rotation for movement from the headset pose
            this.dolly.quaternion.copy( this.dummyCam.getWorldQuaternion(this.q) );
            let blocked = this.checkCollider();
            if(!blocked){
                this.dolly.translateZ(-delta*this.speed);
            };
            this.dolly.quaternion.copy( quaternion );

        }
    }

    setPos = (pos)=>{
        //update position
        this.dolly.position.copy(pos)
    }

    checkCollider = () =>{
        this.config.checkCollider()
    }
    
    loadModels = ()=> {
        const loader = new GLTFLoader();
    loader.setPath('./characters/');
    loader.load('astrid.glb', (gltf) => {
    console.log(gltf);
    let char = gltf.scene;
      //gltf.scale.setScalar(0.1);
      char.traverse(c => {
        c.castShadow = true;
      });

      this._target = char;
      this._params.scene.add(this._target);

      this._mixer = new THREE.AnimationMixer(this._target);
          console.log('gltf character loaded');
        console.log(gltf);

        const clip = gltf.animations[0];
        console.log(clip);
        const action = this._mixer.clipAction(clip);

        this._animations['run'] = {
        clip: clip,
        action: action,
        };

    })
    }

    
    reset = ()=> {
console.log('player reset');
        this.playerVelocity.set( 0, 0, 0 );
        this.player.position.set( 0, 5, 5 );
        this.camera.position.set(0, 6.5, 5);
       // this.camera.position.set( this.player.position );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );
   //     this.controls.update();

    }

    addToScene = (model) =>{
        this.scene.add(model);
        console.log('model added to scene');
        console.log(this.scene);
    }

}

export {PlayerVR}