import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '3d-nft-viewer';

import { VOXMesh } from "three/examples/jsm/loaders/VOXLoader.js";
export default class Item {

    constructor(config){
        let defaults = {
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts',
            castShadow: true,
            isImage: false,
            // override the actions array to set click handlers
            actions: {'click': function(e){ 
                console.log('clicked');
                console.log(this);
            },'dblclick': function(e){
                console.log('dblclick');
                console.log(this);
            }}
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        this.isVRM = false;

        this.loader = this.config.loader;
        if(!this.loader && this.config.is3D){
            console.log('cannot init item without loader is 3d? ',this.config.is3D,' hex: ',this.config.postHashHex);
        };
        this.scene = this.config.scene;
        this.height = this.config.height;
        this.width = this.config.width;
        this.depth = this.config.depth;
        this.modelUrl = this.config.modelUrl;
        this.mixer = null;
        this.action = null;
        this.mesh = this.config.mesh
        this.animRunning = false;
        this.animations = null;
        this.actions = this.config.actions;
        this.initItemEvents();
        this.isItem = true;
        this.isImage = this.config.isImage;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.rotVelocity = new THREE.Vector3();
        this.nftDisplayData = this.parseNFTDisplayData();
        if(this.config.modelUrl){
            console.log('check modelUrl');
            this.getFormatFromModelUrl();
        } else {
           // console.log('no modelUrl');
        }
        if(this.config.physicsWorld){
            this.initPhysics();
        } else {
           // console.log('nophysicsWorld');

        }

    }

    initPhysics = () =>{
        console.log('initPhysics');
        this.physics = new Physics({world:this.config.physicsWorld, scene:this.config.scene});
    }

    getFormatFromModelUrl = () =>{
        let parts = this.config.modelUrl.split('.');
        let format = parts[parts.length-1];

        if(format!=this.config.format){
            this.config.format = format;
        }

    }

    parseNFTDisplayData = () =>{
        let nft = this.config.nft;
        if(!this.config.nft){
            return false;
        };
        if(!nft.profileEntryResponse){
            return {};
        };        
        let data = {
            creator: nft.profileEntryResponse.username,
            description: nft.body,
            maxPrice: (nft.maxPrice>0)?this.convertNanosToDeso(nft.maxPrice,4):0,
            minPrice: (nft.minPrice>0)?this.convertNanosToDeso(nft.minPrice,4):0,
            isBuyNow: nft.isBuyNow,
            likeCount: nft.likeCount,
            created:this.formatDate(nft.timeStamp / 1000000),
            diamondCount:nft.diamondCount,
            buyNowPrice: this.convertNanosToDeso(nft.buyNowPrice,4),
            copies: nft.numNFTCopies,
            copiesForSale: nft.numNFTCopiesForSale,            
            commentCount: nft.commentCount,
            nftzUrl: 'https://nftz.me/nft/'+nft.postHashHex,
            postHashHex: +nft.postHashHex,
            lastBidPrice: (nft.lastBidPrice>0)?this.convertNanosToDeso(nft.lastBidPrice,4):0,
        }

        return data;
    }


    convertNanosToDeso = (nanos, d) =>{
        return (nanos / 1e9).toFixed(d)        
    }

    formatDate =(date)=> {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(date).toLocaleTimeString('en', options);
    }    

    resetVelocity = ()=>{
        this.velocity.setX(0);
        this.velocity.setY(0);
        this.velocity.setZ(0);
        this.direction.set(0,0,0)
    }

    hasArmature = () =>{
        let that = this;
        this.armature = null;
        this.modelChildren = [];
        let scene;


        if(this.root.armature){
            this.armature = this.root.armature;
            return true;
        };

        if(this.root.scene){
            scene = this.root.scene;
        } else {
            scene = this.root;
        }

        if(!scene.children){
            console.log('scene has no children');
            return false;
        }
   
        scene.children.forEach((el)=>{
            if(el.name === 'Armature'){
                that.armature = el;
            } else {
                that.modelChildren.push(el);
            }
        });

        return (!this.armature === null);
    }

    hasAnimations = (obj) =>{
        if(!obj){
            obj = this.root;
        };

        if(this.root.animations){
            if(this.root.animations.length>0){
                this.animations = this.root.animations;
                return true;
            };            
        }

        if(this.mesh.animations){
            if(this.mesh.animations.length>0){
                this.animations = this.mesh.animations;
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

    getAnimations = ()=>{
        if(this.hasAnimations()){
            return this.animations;
        } else {
            return false;
        }
    }
    initItemEvents = () =>{
        this.meshPlacedEvent = new CustomEvent('placed', {detail: {mesh: this.mesh}});
    }

    placeModel = (pos) =>{
        let that = this;
        return new Promise((resolve,reject)=>{
            this.fetchModel(this.modelUrl, pos)
            .then((model)=>{
                resolve(model);
            }).catch((err=>{
                console.log( err);
            }))
        })
    
    }

    place = (pos) =>{
        let that = this;
        if(typeof(pos)==='undefined'){
            throw('Cant place at undefined position');
        };
        return new Promise((resolve,reject)=>{
            if(that.mesh){
                that.mesh.position.copy(pos);
                that.scene.add(this.mesh);
                that.fixYCoord(this.mesh, pos);
                if(that.config.physicsWorld){
                    that.addToPhysicsWorld();
                }

                resolve(this.mesh, pos);
            } else{
                this.fetchModelUrl()
                .then((modelUrl)=>{
                    if(!that.retrievedModelUrlIsValid(modelUrl)){
                        reject('Invalid ModelUrl in ExtraData: '+modelUrl);
                        return;
                    } else {
                        //console.log('validated modelUrl: ',modelUrl);
                        that.modelUrl = modelUrl;
                        that.placeModel(pos)
                        .then((model)=>{
                            that.mesh = model;

                            if(that.hasAnimations(false)){
                                that.startAnimation(0,THREE.LoopRepeat);
                            } else {
                            /*    console.log('no animations',this.config.postHashHex);
                                console.log(model);
                                console.log('root: ');
                                console.log(that.root);*/
                            };

                            if(that.config.physicsWorld){
                                that.addToPhysicsWorld();
                            }
                            let loadedEvent = new CustomEvent('loaded', {detail: {mesh: this.mesh, position:pos}});
                            document.body.dispatchEvent(loadedEvent);
                            document.body.dispatchEvent(this.meshPlacedEvent);
                            resolve(model, pos);
                        })
                    };
                }).catch(err =>{
                    console.log(err);
                })
            }
        });

    }

    addToPhysicsWorld = () =>{

        let opts = {
                    shape: 'box',
                    mesh: this.mesh,
                    bodyType: CANNON.Body.STATIC
                };

        this.physicsBody = this.physics.addToPhysicsWorld(opts);
    }

    retrievedModelUrlIsValid = (modelUrl) =>{
        if(typeof(modelUrl)==='undefined'){
            return false;        
        };        
        if(modelUrl===''){
            return false;        
        };
        if(modelUrl === 'https://desodata.azureedge.net/'){
            return false;
        };
        if(modelUrl === 'https://desodata.azureedge.net'){
            return false;
        };   
        return true;
    }

    remove = () =>{
        this.scene.remove(this.mesh.children[0]);
    }
    moveTo = (pos)=>{
       // console.log('current: ',this.mesh.position);
       // console.log('moveto: ',pos);
        this.mesh.position.copy(pos);
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
                resolve(this.config.modelUrl);
                return;
            } else {
                let url = this.config.nftsRoute;
                console.log('fetchModelUrl: ',this.config.nftsRoute);
                if(url.trim()===''){
                    reject('No nftsRoute or modelUrl exists for this item');
                    return;
                };
                fetch(url,{ method: "get"})
                .then(response => response.text())
                .then((data)=>{ 
                    if(typeof(data)=== undefined){
                        reject('undefined response from ',url);
                        return;
                    };
                    if(data.indexOf('DOCTYPE')>-1){
                        reject('DOCTYPE error recieved from ',this.config );
                        return;
                    };
                    let fullUrl = that.config.modelsRoute+data;
                    resolve(fullUrl);
                });
            }
        })
        
    }

    fetchModel = async(modelUrl, posVector) =>{
        
        let that = this;

        return new Promise((resolve,reject)=>{
           // console.log('fetchModel: ',modelUrl);
           // console.log('that.loader: ',that.loader);            
            that.loader.load(modelUrl, (root)=> {
                that.root = root;
                let loadedItem = null;

                if(root.scene){
                    loadedItem = root.scene;
                } else {
                    loadedItem = root;
                };     
            /*               
                if(that.hasArmature()){
                    console.log('armature detected');
                    console.log(this.armature);
                } else {
*/
                    that.mesh = loadedItem;
                    that.mesh.userData.owner = this;
                    that.mesh.owner = this;                
                    let obj3D = this.convertToObj3D(loadedItem);
                    if(obj3D===false){
                        console.log('could not convert item for scene');
                        return false;
                    };
                  
                    this.scaleToFitScene(obj3D, posVector);
                    this.fixYCoord(obj3D, posVector); 
                    resolve(obj3D);

              //  }
               

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

scaleToFitScene = (obj3D, posVector) =>{

    let that = this;

        //console.log('posVector:',posVector);
        let boxMesh = this.createContainerBox(posVector);
        console.log(boxMesh);
        let sceneBounds = new THREE.Box3().setFromObject( boxMesh );

        let meshBounds = null    
            meshBounds = new THREE.Box3().setFromObject( obj3D );

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
        //console.log('newMeshBounds',newMeshBounds);
        let newLengthMeshBounds = {
            x: Math.abs(newMeshBounds.max.x - newMeshBounds.min.x),
            y: Math.abs(newMeshBounds.max.y - newMeshBounds.min.y),
            z: Math.abs(newMeshBounds.max.z - newMeshBounds.min.z),
        };
        
        let cbox = that.createContainerBoxForModel(newLengthMeshBounds.x, newLengthMeshBounds.y, newLengthMeshBounds.z, posVector);
        cbox.position.copy(posVector);

        // center of box is position so move up by 50% of newLengthMeshBounds.y
        //let yOffset = newLengthMeshBounds.y/2;
        //cbox.position.setY(cbox.position.y+yOffset);
        //cbox.add(obj3D);
        //obj3D.updateWorldMatrix();

        cbox.userData.owner = this; //set reference to Item
        that.scene.add(obj3D);    
        obj3D.position.copy(posVector);
        cbox.updateMatrixWorld();    
    }

    getBoxHelperVertices = (boxHelper) =>{
        var points = [];
        let lowest = 1000000;
        let lowestVertex = null;
        for(var i = 0; i < 8; ++i) {
            var x = boxHelper.geometry.attributes.position.getX(i)
            var y = boxHelper.geometry.attributes.position.getY(i)
            var z = boxHelper.geometry.attributes.position.getZ(i)
            points.push({x: x, y:y, z: z})
            if(y<lowest){
                lowest = y;
                lowestVertex = new THREE.Vector3(x,y,z);
            }
        }
        //console.log('lowest point in helper: ',lowest);
        return lowestVertex;
    }

    getFloorYCoord = (posVector) =>{
        let boxmeshFloor = posVector.y;
        return boxmeshFloor;
    }

    postionMeshOnFLoor = (mesh, posVector, scaledMeshHeight) =>{
      /*  let destY = posVector.y;
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
        };*/
        //posVector.setY(mesh.position.y+1);
        mesh.position.copy(posVector);


    }

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0x99FFFF, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }

    createContainerBoxForModel = (width, height, depth, posVector) =>{
        const geometry = new THREE.BoxGeometry(width, height, depth);
      //  console.log('createContainerBoxForModel: ', width, height, depth);
        if(!this.config.color){
            this.config.color = 0xff3333;
        };
        
        const material = new THREE.MeshPhongMaterial({
            color: this.config.color,
            opacity: 0,
            transparent: true
        });

        let boxMesh = new THREE.Mesh( geometry, material );
        return boxMesh;
    }

    setDimensions = (w,h,d) =>{
        this.config.width = w;
        this.config.height = h;
        this.config.depth = d;
    }

    setTarget = () =>{

    }

    createContainerBox = (posVector) =>{
        const geometry = new THREE.BoxGeometry(this.config.width, this.config.height,this.config.depth);
        
        if(!this.config.color){
            this.config.color = 0xff3333;
        };
        
        const material = new THREE.MeshPhongMaterial({
            color: this.config.color,
            opacity: 0,
            transparent: true
        });

        let boxMesh = new THREE.Mesh( geometry, material );
            boxMesh.position.copy(posVector);

        return boxMesh;
    }

    convertToObj3D = (loadedItem) =>{
        let loadedType = loadedItem.type;
        let material, vertexColors, geometry;
       // console.log('loaded type: ',loadedType);
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
        object3d.castShadow = false;
        return object3d;
    }

    fixYCoord = (obj3D, posVector) =>{
        var helper = new THREE.BoxHelper(obj3D, 0x00ff00);
            helper.update();

        let lowestVertex = this.getBoxHelperVertices(helper);
        if(!lowestVertex){

            return false;
        };
        lowestVertex.applyMatrix4(helper.matrixWorld);
        if(posVector.y !== lowestVertex.y){
            let yOffset = lowestVertex.y-posVector.y;
            obj3D.position.setY(obj3D.position.y - yOffset);
        };
    }

    startAnimation = (animIndex, loopType) =>{

        /* accepts 
            THREE.LoopOnce
            THREE.LoopRepeat
            THREE.LoopPingPong */

        this.setCurrentAnimation(animIndex);
        this.startCurrentAnimation(loopType);        
    }
    setCurrentAnimation = (animIndex) => {
        this.currentAnimation = animIndex;
    }

    startCurrentAnimation = (loopType) => {
        if(!loopType){
            loopType = THREE.LoopRepeat
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
                    //console.log('animation not running now');                    
                    that.setAnimRunning(false);
                }, false);
            } else {
                //console.log('animation', animIndex, 'doesnt exist');
            }
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

        if(mesh.position.y!=0){
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
              //  console.log(meshBounds);
            }
        });
        return meshBounds;
    }

    getPosition = () =>{
        return this.mesh.position;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

}

export {Item}