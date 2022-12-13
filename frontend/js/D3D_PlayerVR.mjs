import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CollisionChecker } from '3d-nft-viewer';


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
        this.playerCollider = null;        
        this.buildDolly();
        this.dir = new THREE.Vector3();
        this.q = new THREE.Quaternion();        // rotation
        this.speed = 0.25;
        this.proxy = this.config.controlProxy;
        this.oldPos = new THREE.Vector3();
        this.newPos = new THREE.Vector3();        
        this.playerVelocity = new THREE.Vector3();
        this.gravity = 5;
        this.gravityVector = new THREE.Vector3(0,-1,0);
        this.worldDir = new THREE.Vector3();

        this.collisionChecker = new CollisionChecker({  sceneCollider: this.config.sceneCollider,
                                                        playerCollider: this.playerCollider,
                                                        dollyProxy: this.dolly,
                                                        updatePos: (pos) =>{
                                                            this.setPos(pos)
                                                        }
                                                    });
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
//this.config.playerStartPos.y = 60;
        let startY = this.config.playerStartPos.y;
        this.camera.position.set( 0, startY, 0 );
        this.camera.rotation.set(0,0,0);
        this.dolly = new THREE.Group();

console.log('buildDolly this.config.playerStartPos');
console.log(this.config.playerStartPos);
        this.dolly.position.copy(this.config.playerStartPos);
        this.dolly.add( this.camera );

        this.dolly.add(this.config.controllers[0]);
        this.dolly.add(this.config.grips[0]);
        this.dolly.add(this.config.controllers[1]);
        this.dolly.add(this.config.grips[1]);

        console.log('addded controllers and grips to group');
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );
        this.playerCollider = this.buildPlayerCollider();
        this.dolly.add(this.playerCollider);
        this.playerCollider.position.copy(this.config.playerStartPos);
        this.playerCollider.updateMatrixWorld();

    }

    buildPlayerCollider = () =>{
        let pColl = new THREE.Mesh(
            new RoundedBoxGeometry( 1.0, 2.0, 1.0, 10, 0.5 ),
            new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.5})
        );

        pColl.geometry.translate( 0, - 0.5, 0 );
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
        this.dolly.getWorldDirection(this.worldDir);


     /*   let gravityFactor = delta * this.gravity;
        this.dolly.position.y = this.dolly.position.y-gravityFactor;
        this.newPos.copy(this.dolly.position); // coppy current for ajusting
*/
    //    const quaternion = this.dolly.quaternion.clone();  


       // this.dolly.quaternion.copy( this.dummyCam.getWorldQuaternion(this.q) );        
        
        let speedFactor = delta*this.speed;


        switch(this.proxy.dir){
            case 'f':
                this.dolly.position.addScaledVector( this.worldDir, speedFactor );
            break;
            case 'b':
                this.dolly.position.addScaledVector( this.worldDir, -speedFactor );
            break;
            case 'l':
                this.dolly.translateX(speedFactor);
            break;
            case 'r':
                this.dolly.translateX(-speedFactor);
            break;
        }           

   //     this.dolly.quaternion.copy( quaternion );

        if(this.proxy.rot){
           if(!this.proxy.isRotating){

                switch(this.proxy.rot){
                    case 'rr':
                        this.proxy.isRotating = true;

                        this.dolly.rotateY(-Math.PI/4)
                        this.proxy.rot = null;
                        this.dolly.getWorldDirection(this.worldDir);                    
                        this.proxy.rot = null;

                    break;
                    case 'rl':
                        this.proxy.isRotating = true;                      
                        this.dolly.rotateY(Math.PI/4)
                        this.dolly.getWorldDirection(this.worldDir);                    
                        this.proxy.rot = null;

                    break;  
                };
            }
        }

        this.collisionChecker.checkCollisions(delta);
                 //   console.log('Final');
        this.dolly.getWorldDirection(this.worldDir);                    
               //     console.log(this.worldDir);

                
      //  this.setPos(this.newPos);
    }

    setPos = (pos)=>{
        //update position
        this.dolly.position.copy(pos)
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