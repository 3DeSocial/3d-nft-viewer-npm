let THREE;
import { VOXMesh } from "three/examples/jsm/loaders/VOXLoader.js";
export default class Item {

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
        
        THREE = this.config.three;
        this.loader = this.config.loader;
        this.scene = this.config.scene;
        this.height = this.config.height;
        this.width = this.config.width;
        this.depth = this.config.depth;
        this.modelUrl = this.config.modelUrl;
        this.mixer = null;
        this.action = null;
        this.mesh = null;
        this.animRunning = false;
        this.initItemEvents();


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

    initItemEvents = () =>{
        this.meshPlacedEvent = new CustomEvent('placed', {detail: {mesh: this.mesh}});
    }

    placeModel = (pos) =>{
        let that = this;
        return new Promise((resolve,reject)=>{
            this.fetchModel(this.modelUrl, pos)
            .then((model)=>{
                resolve(model, pos);
            }).catch((err=>{
                console.log( err);
            }))
        })
    
    }

    place = (pos) =>{
        let that = this;

        return new Promise((resolve,reject)=>{
            this.fetchModelUrl()
            .then((modelUrl)=>{
                that.modelUrl = modelUrl;
                that.placeModel(pos)
                .then((model, pos)=>{
                    let loadedEvent = new CustomEvent('loaded', {detail: {mesh: this.mesh}});
                    document.body.dispatchEvent(loadedEvent);
                    document.body.dispatchEvent(this.meshPlacedEvent);
                    resolve(model, pos);
                })
            });
        });
    }

    centerMeshInScene = (gltfScene) =>{
        let firstMesh = null;

        if(gltfScene.children.length === 1){
            firstMesh = gltfScene.children[0];
            firstMesh.geometry.center();
            return firstMesh;            
        } else {
            gltfScene.traverse( c => {

                if ( c.isMesh ) {

                    firstMesh = c;
                    firstMesh.geometry.center();
                    return firstMesh;  
                }

            } );
        }


    }
    
    fetchModelUrl = async() =>{
        let that = this;

        return new Promise((resolve,reject)=>{
            // fetch from config if available
            if(this.config.modelUrl!==''){
                console.log('config url: ',this.config.modelUrl);
                resolve(this.config.modelUrl);
            } else {
                let url = this.config.nftsRoute+'/'+that.config.nftPostHashHex;
                    console.log('fetchModelUrl from: '+url);

                fetch(url,{ method: "post"})
                .then(response => response.json())
                .then((data)=>{ 

                    if(data !== undefined){
                        console.log('that.config.nftPostHashHex: '+that.config.nftPostHashHex);
                        console.log('that.config.modelsRoute: '+that.config.modelsRoute);
                        console.log('modelUrl: '+that.config.modelUrl);

                        let fullUrl = that.config.modelsRoute+'/'+that.config.nftPostHashHex+data.modelUrl;
                        resolve(fullUrl);
                    } else {
                        reject();
                    }
                });
            }
        })
        
    }

    fetchModel = async(modelUrl, posVector) =>{
        
        let that = this;
        let boxMesh = this.addContainerBoxToScene(posVector);
        let sceneBounds = new THREE.Box3().setFromObject( boxMesh );
        return new Promise((resolve,reject)=>{


            let meshBounds = null;

            console.log('loader attempting load of: ',modelUrl);
            that.loader.load(modelUrl, (root)=> {
                this.root = root;
                let loadedItem = null;

                if(root.scene){
                    console.log('NOT using root');
                    loadedItem = root.scene;
                } else {
                                        console.log('using root');

                    loadedItem = root;
                };

                let obj3D = this.convertToObj3D(loadedItem);
                if(obj3D===false){
                    console.log('could not convert item for scene');
                    return false;
                };


              /* if(that.shouldBeCentered(root.scene.children)){
                    let h = that.getImportedObjectSize(model.scene);
                    let heightOffset = h/2;                    
                    root.scene.children[0].position.setX(0);
                    root.scene.children[0].position.setZ(0);
                    root.scene.children[0].position.setY(heightOffset);                       
                    that.centerMeshInScene(model.scene);                
                };

*/
              
                 meshBounds = new THREE.Box3().setFromObject( obj3D );
                
                console.log(meshBounds);
                console.log(obj3D);

                // Calculate side lengths of scene (cube) bounding box
                let lengthSceneBounds = {
                  x: Math.abs(sceneBounds.max.x - sceneBounds.min.x),
                  y: Math.abs(sceneBounds.max.y - sceneBounds.min.y),
                  z: Math.abs(sceneBounds.max.z - sceneBounds.min.z),
                };   




                // Calculate side lengths of glb-model bounding box
                let lengthMeshBounds = {
                  x: Math.abs(meshBounds.max.x - meshBounds.min.x),
                  y: Math.abs(meshBounds.max.y - meshBounds.min.y),
                  z: Math.abs(meshBounds.max.z - meshBounds.min.z),
                };
                console.log('height before scale: ',lengthMeshBounds.y);

                // Calculate length ratios
                let lengthRatios = [
                  (lengthSceneBounds.x / lengthMeshBounds.x),
                  (lengthSceneBounds.y / lengthMeshBounds.y),
                  (lengthSceneBounds.z / lengthMeshBounds.z),
                ];

                let minRatio = Math.min(...lengthRatios);
                // Use smallest ratio to scale the model
                if(obj3D.scale.set){
                    obj3D.scale.set(minRatio, minRatio, minRatio);
                    obj3D.updateWorldMatrix();
                };
                let newMeshBounds = new THREE.Box3().setFromObject( obj3D );

                let newLengthMeshBounds = {
                  x: Math.abs(newMeshBounds.max.x - newMeshBounds.min.x),
                  y: Math.abs(newMeshBounds.max.y - newMeshBounds.min.y),
                  z: Math.abs(newMeshBounds.max.z - newMeshBounds.min.z),
                };

                console.log('height after scale: ',newLengthMeshBounds.y);

        let targetFloorYCoord = this.getFloorYCoord(posVector);

                this.postionMeshOnFLoor(obj3D, targetFloorYCoord, newLengthMeshBounds.y);
                 let planePos = new THREE.Vector3(0,targetFloorYCoord,0);
               //  this.addPlaneAtPos(planePos)
                that.mesh = obj3D;
                that.scene.add(that.mesh);
                resolve(obj3D);
            },
            this.onProgressCallback,
            this.onErrorCallback);

        })
      
    }

onProgressCallback = ()=> {}
onErrorCallback = (e)=> {
    console.log('loading error');
    console.log(e);
}
    getFloorYCoord = (posVector) =>{
        let boxmeshFloor = posVector.y;
        return boxmeshFloor;
    }

    postionMeshOnFLoor = (mesh, destY, scaledMeshHeight) =>{
        let yOffset = scaledMeshHeight/2;
        let y = destY + yOffset;
        if(mesh.geometry){
            mesh.geometry.center();
        };        
        if(mesh.children.length===1){
            if(mesh.children[0].geometry){
                mesh.children[0].geometry.center();
            };
            mesh.children[0].position.setX(0);
            mesh.children[0].position.setY(0);
            mesh.children[0].position.setZ(0);
        };
        mesh.position.setY(y);
        console.log('set Object3D center position to ',y);

    }

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0x99FFFF, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }

    addContainerBoxToScene = (posVector) =>{
        const geometry = new THREE.BoxGeometry(this.config.width, this.config.height,this.config.depth);
        
        if(!this.config.color){
            this.config.color = 0xff3333;
        };
        
        const material = new THREE.MeshPhongMaterial({
            color: this.config.color,
            opacity: 0.5,
            transparent: true
        });

        let boxMesh = new THREE.Mesh( geometry, material );
        boxMesh.position.copy(posVector);
        return boxMesh;
    }

    convertToObj3D = (loadedItem) =>{
        let loadedType = loadedItem.type;
        let material, vertexColors, geometry;
        console.log('loaded type: ',loadedType);
        switch(loadedType){
            case 'Object3D','Mesh':
            break;
            case 'BufferGeometry':
                loadedItem.center();
                switch(this.config.format){
                    case 'xyz': //points format
                        vertexColors = ( loadedItem.hasAttribute( 'color' ) === true );
                        material = new THREE.PointsMaterial( { size: 0.1, vertexColors: vertexColors } );
                        loadedItem = new THREE.Points( loadedItem, material );
                    break;
                    case 'vtk':
                        geometry = loadedItem;
                        geometry.computeVertexNormals();
                        geometry.center();

                        material = new THREE.MeshLambertMaterial( { color: 0xff0000 } );
                        loadedItem = new THREE.Mesh( geometry, material );
                    break;

                };
               
            break;
            case 'Scene':
            break; 
            case 'Group':
            break;   
            case undefined:

                switch(this.config.format){
                    case 'vox':
                    let scene = new THREE.Scene()
                        for ( let i = 0; i < loadedItem.length; i ++ ) {

                            const chunk = loadedItem[ i ];

                            // displayPalette( chunk.palette );

                            const mesh = new VOXMesh( chunk );
                            mesh.scale.setScalar( 0.0015 );
                            scene.add( mesh );

                        };
                        return scene;
                    break;
                }
            break;
            default: 
                console.log('unknown type: ',loadedType);
            return false;
        };
        return this.configureImportedObject(loadedItem);

    }

    configureImportedObject = (object3d) =>{
        object3d.castShadow = true;
        return object3d;
    }

    startAnimation = (animIndex) =>{
        this.setCurrentAnimation(animIndex);
        this.startCurrentAnimation();        
    }
    setCurrentAnimation = (animIndex) => {
        this.currentAnimation = animIndex;
    }

    startCurrentAnimation = (loopType) => {
        if(!loopType){
            loopType = THREE.LoopOnce
        };
        let that = this;
        let animIndex = this.currentAnimation;
        if(this.animations){
            if(this.animations[animIndex]){
                this.mixer = new THREE.AnimationMixer( this.mesh );

                let animation = this.animations[animIndex];
                 
                this.action = this.mixer.clipAction(animation);
                this.action.setLoop(loopType);
                this.action.play();
                this.animRunning = true;
                this.mixer.addEventListener('finished',(e)=>{
                    console.log('animation not running now');                    
                    that.setAnimRunning(false);
                }, false);
            } else {
                console.log('animation', animIndex, 'doesnt exist');
            }
        } else {
            console.log('no animations: ');
            console.log(this.mesh);
        }
    }

    stopAnimation = () =>{
        if(this.action){
           this.action.stop();
           this.action = null;
        }
        this.animRunning = false;
    }

    setAnimRunning =(value)=>{
        this.animRunning = value;
        console.log('animation running set to: ',value);
    }

    shouldBeCentered = (children) =>{

        if(children.length>1){
            return false;// dont center      
        };        
    
        if(!children[0].isMesh){
            return false; // dont center         
        };
        let mesh = children[0];
        if(mesh.position.x!=0){
            return true;
        };
    
        if(mesh.position.z!=0){
            return true;
        };

        return false;
    }

    getImportedObjectSize = (obj) =>{
        let box = new THREE.Box3().setFromObject(obj);
        let center = new THREE.Vector3();
        let size = new THREE.Vector3();
        let max = box.max;
        let min = box.min;
        let d = max.z - min.z;
        let w = max.x - min.x;
        let h = max.y - min.y;

        return h;
    }

    setScale = (model) =>{

        //create a box which is the desired size of the nft

        let lengthSceneBounds = {
          x: 2,
          y: 2,
          z: 2,
        };

        let meshBounds = this.getMeshBounds(model);
        
        let lengthMeshBounds = {
          x: Math.abs(meshBounds.max.x - meshBounds.min.x),
          y: Math.abs(meshBounds.max.y - meshBounds.min.y),
          z: Math.abs(meshBounds.max.z - meshBounds.min.z),
        }

        let lengthRatios = [
          (lengthSceneBounds.x / lengthMeshBounds.x),
          (lengthSceneBounds.y / lengthMeshBounds.y),
          (lengthSceneBounds.z / lengthMeshBounds.z),
        ];
        
        let minRatio = Math.min(...lengthRatios);

        model.scale.set(minRatio, minRatio, minRatio);

    }

    getMeshBounds = (model) => {
        let that = this;
        let meshBounds = null;

        model.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.geometry.computeBoundingBox()
                meshBounds = child.geometry.boundingBox;
                console.log(meshBounds);
            }
        });
        return meshBounds;
    }

    getPosition = () =>{
        let copiedPos = new THREE.Vector3();
            copiedPos.copy(this.mesh.position);
            console.log('item pos: ', copiedPos);
            return copiedPos;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

    addToScene = (model) =>{
        this.scene.add(model);
        console.log('model added to scene');
        console.log(this.scene);
    }

}

export {Item}