import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE_VRM from '@pixiv/three-vrm';
import {AnimLoader} from '3d-nft-viewer';
const helperRoot = new THREE.Group();

    /**
     * A map from Mixamo rig name to VRM Humanoid bone name
     */
    const mixamoVRMRigMap = {
        mixamorigHips: 'hips',
        mixamorigSpine: 'spine',
        mixamorigSpine1: 'chest',
        mixamorigSpine2: 'upperChest',
        mixamorigNeck: 'neck',
        mixamorigHead: 'head',
        mixamorigLeftShoulder: 'leftShoulder',
        mixamorigLeftArm: 'leftUpperArm',
        mixamorigLeftForeArm: 'leftLowerArm',
        mixamorigLeftHand: 'leftHand',
        mixamorigLeftHandThumb1: 'leftThumbMetacarpal',
        mixamorigLeftHandThumb2: 'leftThumbProximal',
        mixamorigLeftHandThumb3: 'leftThumbDistal',
        mixamorigLeftHandIndex1: 'leftIndexProximal',
        mixamorigLeftHandIndex2: 'leftIndexIntermediate',
        mixamorigLeftHandIndex3: 'leftIndexDistal',
        mixamorigLeftHandMiddle1: 'leftMiddleProximal',
        mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
        mixamorigLeftHandMiddle3: 'leftMiddleDistal',
        mixamorigLeftHandRing1: 'leftRingProximal',
        mixamorigLeftHandRing2: 'leftRingIntermediate',
        mixamorigLeftHandRing3: 'leftRingDistal',
        mixamorigLeftHandPinky1: 'leftLittleProximal',
        mixamorigLeftHandPinky2: 'leftLittleIntermediate',
        mixamorigLeftHandPinky3: 'leftLittleDistal',
        mixamorigRightShoulder: 'rightShoulder',
        mixamorigRightArm: 'rightUpperArm',
        mixamorigRightForeArm: 'rightLowerArm',
        mixamorigRightHand: 'rightHand',
        mixamorigRightHandPinky1: 'rightLittleProximal',
        mixamorigRightHandPinky2: 'rightLittleIntermediate',
        mixamorigRightHandPinky3: 'rightLittleDistal',
        mixamorigRightHandRing1: 'rightRingProximal',
        mixamorigRightHandRing2: 'rightRingIntermediate',
        mixamorigRightHandRing3: 'rightRingDistal',
        mixamorigRightHandMiddle1: 'rightMiddleProximal',
        mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
        mixamorigRightHandMiddle3: 'rightMiddleDistal',
        mixamorigRightHandIndex1: 'rightIndexProximal',
        mixamorigRightHandIndex2: 'rightIndexIntermediate',
        mixamorigRightHandIndex3: 'rightIndexDistal',
        mixamorigRightHandThumb1: 'rightThumbMetacarpal',
        mixamorigRightHandThumb2: 'rightThumbProximal',
        mixamorigRightHandThumb3: 'rightThumbDistal',
        mixamorigLeftUpLeg: 'leftUpperLeg',
        mixamorigLeftLeg: 'leftLowerLeg',
        mixamorigLeftFoot: 'leftFoot',
        mixamorigLeftToeBase: 'leftToes',
        mixamorigRightUpLeg: 'rightUpperLeg',
        mixamorigRightLeg: 'rightLowerLeg',
        mixamorigRightFoot: 'rightFoot',
        mixamorigRightToeBase: 'rightToes',
    };

export default class ItemVRM {


    constructor(config){
        let defaults = {
            defaultAnimPostHashHex: '95c405260688db9fbb76d126334ee911a263352c58dbb77b6d562750c5ce1ed2',
            format: 'vrm',
            animations: [], // all possible animations
            animationUrl:'/mixamo/Victory.fbx',
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

        this.isVRM = true;
        this.loader = this.config.loader;
        if(!this.loader && this.config.is3D){
            console.log('cannot init item without loader is 3d? ',this.config.is3D,' hex: ',this.config.postHashHex);
        };
        this.mixer = undefined;
        this.currentVrm = undefined;
        this.currentAnimationUrl = undefined;
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
        if(this.config.animLoader){
            this.animLoader = this.initAnimLoader({animHashes:[ '287cb636f6a8fc869f5c0f992fa2608a2332226c6251b1dc6908c827ab87eee4',
                                                                    '8d931cbd0fda4e794c3154d42fb6aef7cf094481ad83a83e97be8113cd702b85',
                                                                    '95c405260688db9fbb76d126334ee911a263352c58dbb77b6d562750c5ce1ed2',
                                                                    '1a27c2f8a2672adbfdb4df7b31586a890b7f3a95b49a6937edc01de5d74072f2']});
        }


    }


    // mixamo animation
    loadMixamo = ( currentAnim ) => {
        let that = this;




        this.currentAnimationUrl = currentAnim.url;
        if(this.currentAnimationUrl){
            // create AnimationMixer for VRM


               

                        // Load animation
                  //  console.log('currentAnim needs some action: ', this.currentAnimationUrl);

                this.loadMixamoAnimation( this.currentAnimationUrl, this.currentVrm ).then( ( clip ) => {

                        // Apply the loaded animation to mixer and play
                        that.currentAnim.action = that.startAnimClip(clip);
                    //    console.log('set anim running, ', this.currentAnim.url)
                } );


              }

    }

    startAnimClip = (clip) =>{

        let action = this.mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat);
            action.clampWhenFinished  = true;
            action.play();
        this.animRunning = true;    
        return action;    
    }

    startAnimAction = (action)=>{
        action.setLoop(THREE.LoopRepeat);
        action.clampWhenFinished  = true;
        action.play();
        this.animRunning = true;    
        return action;    
    }

    loadMixamoAnimation = ( url, vrm ) => {

        const loader = new FBXLoader(); // A loader which loads FBX
        return loader.loadAsync( url ).then( ( asset ) => {

        const clip = THREE.AnimationClip.findByName( asset.animations, 'mixamo.com' ); // extract the AnimationClip

        const tracks = []; // KeyframeTracks compatible with VRM will be added here

        const restRotationInverse = new THREE.Quaternion();
        const parentRestWorldRotation = new THREE.Quaternion();
        const _quatA = new THREE.Quaternion();
        const _vec3 = new THREE.Vector3();

        // Adjust with reference to hips height.
        const motionHipsHeight = asset.getObjectByName( 'mixamorigHips' ).position.y;
        const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode( 'hips' ).getWorldPosition( _vec3 ).y;
        const vrmRootY = vrm.scene.getWorldPosition( _vec3 ).y;
        const vrmHipsHeight = Math.abs( vrmHipsY - vrmRootY );
        const hipsPositionScale = vrmHipsHeight / motionHipsHeight;

        clip.tracks.forEach( ( track ) => {

            // Convert each tracks for VRM use, and push to `tracks`
            const trackSplitted = track.name.split( '.' );
            const mixamoRigName = trackSplitted[ 0 ];
            const vrmBoneName = mixamoVRMRigMap[ mixamoRigName ];
            const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode( vrmBoneName )?.name;
            const mixamoRigNode = asset.getObjectByName( mixamoRigName );

            if ( vrmNodeName != null ) {

                const propertyName = trackSplitted[ 1 ];

                // Store rotations of rest-pose.
                mixamoRigNode.getWorldQuaternion( restRotationInverse ).invert();
                mixamoRigNode.parent.getWorldQuaternion( parentRestWorldRotation );

                if ( track instanceof THREE.QuaternionKeyframeTrack ) {

                    // Retarget rotation of mixamoRig to NormalizedBone.
                    for ( let i = 0; i < track.values.length; i += 4 ) {

                        const flatQuaternion = track.values.slice( i, i + 4 );

                        _quatA.fromArray( flatQuaternion );

                        // 親のレスト時ワールド回転 * トラックの回転 * レスト時ワールド回転の逆
                        _quatA
                            .premultiply( parentRestWorldRotation )
                            .multiply( restRotationInverse );

                        _quatA.toArray( flatQuaternion );

                        flatQuaternion.forEach( ( v, index ) => {

                            track.values[ index + i ] = v;

                        } );

                    }

                    tracks.push(
                        new THREE.QuaternionKeyframeTrack(
                            `${vrmNodeName}.${propertyName}`,
                            track.times,
                            track.values.map( ( v, i ) => ( vrm.meta?.metaVersion === '0' && i % 2 === 0 ? - v : v ) ),
                        ),
                    );

                } else if ( track instanceof THREE.VectorKeyframeTrack ) {

                    const value = track.values.map( ( v, i ) => ( vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? - v : v ) * hipsPositionScale );
                    tracks.push( new THREE.VectorKeyframeTrack( `${vrmNodeName}.${propertyName}`, track.times, value ) );

                }

            }

        } );

        return new THREE.AnimationClip( 'vrmAnimation', clip.duration, tracks );

    } );

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
            const   loader = new GLTFLoader();
                    loader.crossOrigin = 'anonymous';

                    loader.register( ( parser ) => {

                        return new THREE_VRM.VRMLoaderPlugin( parser, {  autoUpdateHumanBones: true } );

                    } );

            if(this.animLoader) {
                that.currentAnim = that.animLoader.fetchRandAnim();
                that.currentAnimationUrl = that.currentAnim.url;
            }
          
            loader.load(
                // URL of the VRM you want to load
                modelUrl,

                // called when the resource is loaded
                ( gltf ) => {
                    that.root = gltf;
                    const vrm = gltf.userData.vrm;

                    if ( that.currentVrm ) {

                        that.scene.remove( that.currentVrm.scene );

                        THREE_VRM.VRMUtils.deepDispose( that.currentVrm.scene );

                    }

                    // put the model to the scene
                    that.currentVrm = vrm;
                    that.scene.add( vrm.scene );
                    vrm.scene.userData.owner = this; //set reference to 

                    if(!this.mixer && (this.animLoader)){
                        this.mixer = new THREE.AnimationMixer( this.currentVrm.scene );
                        this.mixer.addEventListener('finished',(e)=>{
                            that.setAnimRunning(false);
                            that.currentAnim = that.animLoader.fetchRandAnim();
                             if(this.currentAnim.action){
                                // no need to Load animation
                                let action =  this.startAnimAction(this.currentAnim.action);
                            } else {
                                that.loadMixamo( that.currentAnim );
                            }

                               
                            

                        //that.mesh.scene.position.copy(this.config.pos);
                        }, false);
                    };

                    vrm.scene.position.copy(posVector);


                    // Disable frustum culling
                    vrm.scene.traverse( ( obj ) => {

                        obj.frustumCulled = false;

                    } );

                    that.fixYCoord(vrm.scene, posVector);

                    if ( that.currentAnim ) {

                        that.loadMixamo( that.currentAnim );

                    }

                    // rotate if the VRM is VRM0.0
                    THREE_VRM.VRMUtils.rotateVRM0( vrm );

                    resolve(that.currentVrm);

                },

                // called while loading is progressing
                ( progress ) => ()=>{},//console.log( 'Loading model...', 100.0 * ( progress.loaded / progress.total ), '%' ),

                // called when loading has errors
                ( error ) => console.error( error, that.config.nft.postHashHex ),
            );
          
        })
    }

initAnimLoader = (config) =>{
        return new AnimLoader(config);
    }

scaleToFitScene = (obj3D, posVector) =>{

    let that = this;

        //console.log('posVector:',posVector);
        let boxMesh = this.createContainerBox(posVector);
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
            console.log('no lowestVertex in');
            console.log(obj3D);
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
            THREE.LoopRepeat
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
        let copiedPos = new THREE.Vector3();
            copiedPos.copy(this.mesh.scene.position);
          //  console.log('item pos: ', copiedPos);
            return copiedPos;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

}

export {ItemVRM}