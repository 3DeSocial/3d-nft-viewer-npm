let THREE;
import { VOXMesh } from "three/examples/jsm/loaders/VOXLoader.js";
import {Item} from '3d-nft-viewer';
class Item2d extends Item {

    constructor(config){
        let defaults = {
            imageProxyUrl: '',
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts',
            castShadow: true,
            isImage: true,
            width: 1,
            height:1,
            depth:0.1,
            // override the actions array to set click handlers
            actions: {'click': function(e){ 
                console.log('clicked');
                console.log(this);
            },'dblclick': function(e){
                console.log('dblclick');
                console.log(this);
            }}
        };

        super();
    
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
        this.nftPostHashHex = this.config.nft.postHashHex;
        this.mixer = null;
        this.action = null;
        this.mesh = this.config.mesh
        this.animRunning = false;
        this.animations = null;
        this.actions = this.config.actions;
        this.initItemEvents();
        this.isItem = true;
        let that = this;
        if(this.config.spot){
            if(this.config.spot.dims.height){
                this.height = this.config.spot.dims.height
            }
            if(this.config.spot.dims.width){
                this.width = this.config.spot.dims.width
            }
            if(this.config.spot.dims.depth){
                this.depth = this.config.spot.dims.depth
            }
        };           
        this.nftDisplayData = this.parseNFTDisplayData();

    }

    parseNFTDisplayData = () =>{
        let nft = this.config.nft;
        if(!this.config.nft){
            return false;
        };
        if(!nft.profileEntryResponse){
            console.log('no nft.profileEntryResponse');
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

    getAnimations = ()=>{
        if(this.hasAnimations()){
            return this.animations;
        } else {
            return false;
        }
    }
    initItemEvents = () =>{
        this.meshPlacedEvent = new CustomEvent('placed', {detail: {item: this}});
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
            if(this.mesh){ // already loaded / created

                this.mesh.userData.owner = this;
                this.mesh.position.copy(pos);
                this.scene.add(this.mesh);
               // this.fixYCoord(this.mesh, pos);
                let loadedEvent = new CustomEvent('loaded', {detail: {mesh: this.mesh, position:pos}});
                document.body.dispatchEvent(loadedEvent);
                document.body.dispatchEvent(this.meshPlacedEvent);
                if(this.config.onLoad){
                    this.config.onLoad();
                };
                resolve(this.mesh, pos);
            } else{
                console.log('no mesh to place');
                console.log(this);
            }
        });

    }

    initMesh = async(nft) =>{
        let that = this;
     
        return new Promise(( resolve, reject ) => {

            let imageUrl = nft.imageURLs[0];
            if(!imageUrl){
                reject('No image for NFT ',this.config.nftPostHashHex);
                return false;
            };
            let proxyImageURL = that.config.imageProxyUrl +imageUrl;
            let nftData = nft;
            var img = new Image();
               let targetWidth = this.width;

            if(nft.spot.dims.width){
                targetWidth = nft.spot.dims.width;
            }
            let targetHeight = this.height;
            if(nft.spot.dims.height){
               targetHeight = nft.spot.dims.height;
            }
           // console.log('targetWidth: ', targetWidth,'targetHeight: ',targetHeight)
                img.onload = function(){
                  var height = this.height;
                  var width = this.width;
                  let dims = that.calculateAspectRatioFit(width, height, targetWidth,targetHeight);
              
                  const textureLoader = new THREE.TextureLoader()
                  const texture = textureLoader.load(this.src);
                  const geometry = new THREE.BoxGeometry( dims.width, dims.height, 0.10 );
                  const materials = that.createMats(texture);
                  const nftMesh = new THREE.Mesh( geometry, materials );
                  that.mesh = nftMesh;
                  let nftImgData = {is3D:nft.is3D, nft:nftData, mesh: nftMesh, imageUrl: imageUrl, width:dims.width, height:dims.height, spot:that.config.spot};
                  resolve(nftImgData);
            };

            img.addEventListener('error', (img, error) =>{
            //  console.log('could not load image',img.src);
           //   console.log(error);
              reject(img.src)
            });
            img.src = proxyImageURL;

        })
    }

    createMats = (texture) =>{
        var topside = new THREE.MeshBasicMaterial({color: '#AAAAAA'});
        var bottomside = new THREE.MeshBasicMaterial({color: '#AAAAAA'});        
        var leftside = new THREE.MeshBasicMaterial({color: '#AAAAAA'}); 
        var rightside = new THREE.MeshBasicMaterial({color: '#AAAAAA'});
        var backside = new THREE.MeshBasicMaterial( { map: texture } );
        var frontside = new THREE.MeshBasicMaterial( { map: texture } );

        var materials = [
          rightside,          // Right side
          leftside,          // Left side
          topside, // Top side
          bottomside, // Bottom side
          backside,            // Back side
          frontside          // Front side          
        ];

        return materials;
    }

    calculateAspectRatioFit = (srcWidth, srcHeight, maxWidth, maxHeight) => {

        var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

        return { width: srcWidth*ratio, height: srcHeight*ratio };
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
                let url = this.config.nftsRoute; // returns path to asset
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

            that.loader.load(modelUrl, (root)=> {
                that.root = root;
                let loadedItem = null;

                if(root.scene){
                    loadedItem = root.scene;
                } else {
                    loadedItem = root;
                };
                that.mesh = loadedItem;
                that.mesh.userData.owner = this;
                let obj3D = this.convertToObj3D(loadedItem);
                if(obj3D===false){
                    console.log('could not convert item for scene');
                    return false;
                };
              
                this.scaleToFitScene(obj3D, posVector);
                this.fixYCoord(obj3D, posVector);

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
        //console.log('newMeshBounds',newMeshBounds);
        let newLengthMeshBounds = {
            x: Math.abs(newMeshBounds.max.x - newMeshBounds.min.x),
            y: Math.abs(newMeshBounds.max.y - newMeshBounds.min.y),
            z: Math.abs(newMeshBounds.max.z - newMeshBounds.min.z),
        };
        
        let cbox = that.createContainerBoxForModel(newLengthMeshBounds.x, newLengthMeshBounds.y, newLengthMeshBounds.z, posVector);
        cbox.position.copy(posVector);

        // center of box is position so move up by 50% of newLengthMeshBounds.y
        let yOffset = newLengthMeshBounds.y/2;
        cbox.position.setY(cbox.position.y+yOffset);
        cbox.add(obj3D);
        obj3D.updateWorldMatrix();

        if(this.isImage){
            obj3D.userData.owner = this;
            that.scene.add(obj3D);
        } else {
            cbox.userData.owner = this; //set reference to Item
            that.scene.add(cbox);    
        };
       
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
        //for a 2D NFT this means moving it up by half its height
        var helper = new THREE.BoxHelper(obj3D, 0x00ff00);
            helper.update();

        let lowestVertex = this.getBoxHelperVertices(helper);
        if(!lowestVertex){
            return false;
        };
        lowestVertex.applyMatrix4(helper.matrixWorld);

        if(posVector.y !== lowestVertex.y){
            let yOffset = this.height/2;
            //console.log('yOffset: ',yOffset);
            obj3D.position.setY(obj3D.position.y + yOffset);
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
                    that.setAnimRunning(false);
                }, false);
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
            copiedPos.copy(this.mesh.position);
          //  console.log('item pos: ', copiedPos);
            return copiedPos;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

    addToScene = (model) =>{
        this.scene.add(model);
     //   console.log('model added to scene');
       // console.log(this.scene);
    }

}

export {Item2d}