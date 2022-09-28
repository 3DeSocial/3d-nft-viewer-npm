export const name = 'd3dspaceviewer';
// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HUD, SceneryLoader, Lighting, LayoutPlotter, D3DLoaders, D3DInventory, NFTViewerOverlay, VRButton, VRControls } from '3d-nft-viewer';
import domtoimage from 'dom-to-image';
let clock, gui, stats, delta;
let environment, visualizer, player, controls, geometries;
let playerIsOnGround = false;
let fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false;
let nextPos = new THREE.Vector3();

const params = {
    firstPerson: true,
    displayCollider: false,
    displayBVH: false,
    visualizeDepth: 10,
    gravity: - 30,
    playerSpeed: 10,
    physicsSteps: 20,
    useShowroom: true};

 export default class D3DSpaceViewer {
    
    constructor(config) {

        let defaults = {
                    avatarSize: {width: 1, height:1, depth:1},
                    el: document.body,
                    ctrClass: 'data-nft', // Attribute of div containing nft preview area for a single nft
                    fitOffset: 1.25,
                    nftsRoute: 'nfts', // Back end route to initialize NFTs
                    modelsRoute: 'models',// Back end route to load models
                    sceneryPath: '/layouts/island/scene.gltf',
                    skyboxPath: '',
                    controls: {
                        maxDistance:Infinity,
                        maxPolarAngle:Infinity
                    },
                    vrType: 'walking',
                    useOwnHandlers: true,
                    lookAtStartPos: {x:0, y:4, z:-10}
                };
        
        this.config = {
            ...defaults,
            ...config
        };
        this.containerInitialized = false;
        this.el = this.config.el;
        this.playerVelocity = new THREE.Vector3();
        this.upVector = new THREE.Vector3( 0, 1, 0 );
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempBox = new THREE.Box3();
        this.tempMat = new THREE.Matrix4();
        this.tempSegment = new THREE.Line3();
        this.isFullScreen = false;
        this.floorPlane = null;
        this.cameraVector = new THREE.Vector3();
        this.dolly = null,
        this.prevGamePads = new Map(),
        this.speedFactor = [0.1, 0.1, 0.1, 0.1],
        this.controllers = [];
        this.loaders = new D3DLoaders({defaultLoader:this.defaultLoader});
        this.initLoaders();
        this.clock = new THREE.Clock();
        environment = null;
        this.collider = null;
        this.moveTo = false;
        this.vrType = this.config.vrType;
        this.camPos = new THREE.Vector3();
        this.raycaster = new THREE.Raycaster();
        this.objectsInMotion = []; // use for things being thrown etc

    }

    initSpace = (options) =>{
        return new Promise((resolve, reject) => {
            let that = this;
            this.mouse = { x : 0, y : 0 };
            this.getContainer(this.config.el);
            this.initScene();
            this.initRenderer(this.config.el);
            this.initHUD({renderer:that.renderer});
            this.initSkybox();
            this.initLighting();
            this.loadScenery().then(()=>{
                this.initCameraPlayer();                
               // that.placeAssets();
                if(that.config.firstPerson){
                    that.initPlayerFirstPerson();
                } else {
                    that.initPlayerThirdPerson();
                }
                this.initControls();
                if ( 'xr' in navigator ) {
                    that.initVR();
                }
                this.resizeCanvas();   
                this.renderer.render(this.scene,this.camera);
                this.animate();
                this.controls.update();                
            });
            this.initInventory(options);        

        });
    }

    initHUD = (opts) => {
        this.hud = new HUD(opts);
        this.hud.init();
    }
    loadScenery = () =>{
        let that = this;
        return new Promise((resolve,reject)=>{

            let sceneryOptions = {
                ...{scene : that.scene,
                    castShadow: false,
                receiveShadow : false},
                ...that.config.sceneryOptions
            };

            that.sceneryLoader = new SceneryLoader(sceneryOptions);
            that.sceneryLoader.loadScenery()
            .then((gltf)=>{
                this.collider = that.sceneryLoader.collider;
                that.sceneryMesh = gltf;
                resolve(gltf);
            })
        });
    }

    placeAssets = () =>{
        this.layoutPlotter = new LayoutPlotter({ sceneryLoader: this.sceneryLoader,
                                                 camera: this.camera,
                                                 scene: this.scene,
                                                 inventory: this.inventory,
                                                 sceneryLoader: this.sceneryLoader});    
        this.layoutPlotter.placeSceneAssets();
        //console.log('placeAssets: ',this.inventory.getItems());
        //console.log('placeAssets: ',this.inventory.getItemByHash('1e25c4f29d76c8989db411f5c3171d87ec715ca2ad01498cb47d77ba5df7c6e5'));
    }

    setFormat = (format) =>{
        let loader = this.loaders.getLoaderForFormat(format);
        if(loader === false){
            throw('Error - No Loader Availble for File Format: '+format+' in D3DNFTViewer');
            return false;
        };
        this.format = format;
        this.loader = loader;
    }
    
    getContainer = (parentDivEl) =>{
        //First lets create a parent DIV
        this.parentDivEl = parentDivEl;
        this.parentDivElWidth = this.parentDivEl.offsetWidth;
        this.parentDivElHeight = this.parentDivEl.offsetHeight;        
    }
    initScene = () =>{

        //Lets create a new Scene
        this.scene = new THREE.Scene();

    }

    clearScene = (cb) =>{
        var obj = this.scene;
        this.recursiveDestroy(this.scene,cb);
    }

    clearMesh = (obj, cb) =>{
        obj = this.loadedItem.mesh;
        this.recursiveDestroy(obj,cb);
    }

    recursiveDestroy = (obj, cb) =>{
        while(obj.children.length > 0){ 
            this.recursiveDestroy(obj.children[0], cb);
            obj.remove(obj.children[0]);
        }
        
        if(obj.geometry) obj.geometry.dispose();

        if(obj.material){ 
            //in case of map, bumpMap, normalMap, envMap ...
            Object.keys(obj.material).forEach(prop => {
            if(!obj.material[prop])
                return;

            if(obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')                                  
                obj.material[prop].dispose();                                                      
            });

            obj.material.dispose();
        }
        if(obj.children.length===0){
            cb()
        }
    }

    initContainer(parentDivEl){

        if(this.containerInitialized){
            return true;
        };
        //First lets create a parent DIV
        this.parentDivEl = parentDivEl;
        this.parentDivElWidth = this.parentDivEl.offsetWidth;
        this.parentDivElHeight = this.parentDivEl.offsetHeight;
       // this.initScene();
        
        this.initSkybox();

        this.initCamera();
        this.initRenderer(parentDivEl);
        this.initLighting();
        this.initPlayer();
        this.initControls();
        this.addListeners();
        this.containerInitialized = true;

    }
    initCameraPlayer = () =>{
        // camera setup
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
      //w  this.camera.position.set( 10, 10, - 10 );
        this.camera.far = 1000;
        this.camera.updateProjectionMatrix();        

    }

    initCamera = () =>{
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/600, 0.01, 1000 );
        //Only gotcha. Set a non zero vector3 as the camera position.
//        this.camera.rotation.setX(0);


    }

    initControls = () =>{
        //Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        /*let cameraStartPos = new THREE.Vector3(this.config.cameraStartPos.x, this.config.cameraStartPos.y, this.config.cameraStartPos.z);
        this.camera.position.copy(cameraStartPos);
        this.camera.updateProjectionMatrix();        */
        this.controls.update();
    }

    restrictCameraToRoom = () => {
        this.controls.maxDistance = this.config.controls.maxDistance;
        this.controls.maxPolarAngle = this.config.controls.maxPolarAngle;
        this.controls.update();  
    }

    unRestrictCamera = () => {
        this.controls.maxDistance = Infinity;
        this.controls.maxPolarAngle = Infinity; 
        this.controls.update();
    }

    initRenderer = (el) =>{

        //Create a WebGLRenderer
        this.renderer = new THREE.WebGLRenderer({
                autoClear: false,
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });

        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        //the following increases the resolution on Quest
        this.renderer.xr.setFramebufferScaleFactor(2.0);

        this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        this.renderer.setClearColor( 0x000000, 1 );
      //  this.renderer.domElement.style.display = 'none';

        if(el){
           el.appendChild(this.renderer.domElement);
        } else {
            this.renderer.domElement.style.display = 'none';
            this.el.appendChild(this.renderer.domElement);
        };
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';     
    }


    initSkybox = ()=>{
        if(this.config.skyboxes !== false){
            this.addSky();
        };
    }

    addSky = () =>{
        let skyBoxList = ['blue','bluecloud','browncloud','lightblue','yellowcloud'];
        let skyBoxNo = this.getRandomInt(0,4);
        let skyBox = this.loadSkyBox(skyBoxList[skyBoxNo]);

        this.scene.background = skyBox;
    }

    removeSky = () => {
        this.scene.background = null;
    }

    initLighting = () =>{
        this.lights = new Lighting({scene:this.scene,
                                        createListeners: false});   
    }

    initLoaders = () =>{
        //Loader GLTF
        this.loader = this.loaders.getLoaderForFormat(this.config.defaultLoader);      
    }

    addListeners = ()=>{
        this.addEventListenerResize();
        this.addEventListenerContextLost();
        this.addEventListenerExitFullScreen();
        this.addEventListenerKeys();
        this.addEventListenerMouseClick();
    }    

    addEventListenerKeys = ()=>{
        let that = this;

        window.addEventListener( 'keydown', function ( e ) {
                switch ( e.code ) {

                    case 'KeyW': fwdPressed = true; break;
                    case 'KeyS': bkdPressed = true; break;
                    case 'KeyD': rgtPressed = true; break;
                    case 'KeyA': lftPressed = true; break;
                    case 'KeyM': that.throwActiveItem(); break;

                    case 'Digit0': that.inventory.setActive(0); break;
                    case 'Digit1': that.inventory.setActive(1); break;
                    case 'Digit2': that.inventory.setActive(2); break;
                    case 'Digit3': that.inventory.setActive(3); break;
                    case 'Digit4': that.inventory.setActive(4); break;
                    case 'Digit5': that.inventory.setActive(5); break;
                    case 'Digit6': that.inventory.setActive(6); break;
                    case 'Digit7': that.inventory.setActive(7); break;
                    case 'Digit8': that.inventory.setActive(8); break;

                    case 'Space':
                        if ( that.playerIsOnGround ) {

                            that.playerVelocity.y = 10.0;

                        }

                        break;

                }

            } );

            window.addEventListener( 'keyup', function ( e ) {

                switch ( e.code ) {

                    case 'KeyW': fwdPressed = false; break;
                    case 'KeyS': bkdPressed = false; break;
                    case 'KeyD': rgtPressed = false; break;
                    case 'KeyA': lftPressed = false; break;

                }

            } );

    }

    addEventListenerMouseClick = ()=>{
        let that = this;
        this.renderer.domElement.addEventListener( 'mousedown', this.checkMouse, false );
        this.renderer.domElement.addEventListener( 'dblclick', this.checkMouseDbl, false );

    }

    checkMouse = (e) =>{
        let action = this.raycast(e);
        if(!action.selectedPoint){
            return false;
        };
        this.updateOverlayPos(action.selectedPoint);
        switch(parseInt(action.btnIndex)){
            case 2:
            if(action.isOnWall && (!action.isOnFloor)){
                //console.log('place 2d nft ',action.selectedPoint);
            };
            if(action.isOnFloor){
                this.placeActiveItem(action.selectedPoint);
            };
            break;
            default:
            console.log('default:',action.selection.object);
            if(action.selection.object.userData.owner){
                let item = action.selection.object.userData.owner;
                if(item.config.nft){
                    let nftDisplayData = this.parseNFTDisplayData(item.config.nft);
                    if(item.config.spot){
                        nftDisplayData.spot = item.config.spot;
                        console.log('spot id: ',item.config.spot.id, ', idx: ',item.config.spot.idx,', Y: ',item.config.spot.pos.y );

                    };
                    this.displayInHUD(nftDisplayData);            
                }

                //console.log(action.selection.object.userData.owner.config.nft);
                //console.log('owner: ',action.selection.object.userData.owner.config.nft.profileEntryResponse.username);
                //console.log('body: ',action.selection.object.userData.owner.config.nft.body);

            } else {
                console.log('no owner');
            }
            break;
        }
    }

    throwActiveItem = ()=>{
        let that = this;
        let throwTime = performance.now();
        let item = this.inventory.getActiveItem();
        if(item){
            item.resetVelocity();
            this.camera.getWorldDirection(item.direction);
            item.place(this.player.position).then((mesh,pos)=>{
                mesh.position.setY(this.player.position.y+1);
                item.impulse = 20 + 30 * ( 1 - Math.exp( ( throwTime - performance.now() ) * 0.001 ) );
                item.velocity.copy( item.direction ).multiplyScalar( item.impulse );
                item.velocity.addScaledVector(this.playerVelocity, 4 );
                that.objectsInMotion[0] = item;
             
            })

        } else {
            console.log('no active item');
        }   
    }
    parseNFTDisplayData = (nft) =>{

        let data = {
            creator: nft.profileEntryResponse.username,
            description: nft.body,
            maxPrice: this.convertNanosToDeso(nft.maxprice,4),
            isBuyNow: nft.isBuyNow,
            likeCount: nft.likeCount,
            created:nft.created,
            diamondCount:nft.diamondCount,
            buyNowPrice: this.convertNanosToDeso(nft.buyNowPrice,4),
            copies: nft.copies,
            commentCount: nft.commentCount,
            nftzUrl: 'https://nftz.me/nft/'+nft.postHashHex,
            postHashHex: +nft.postHashHex
        }

        return data;
    }

    convertNanosToDeso = (nanos, d) =>{
        return (nanos / 1e9).toFixed(d)        
    }

    checkMouseDbl = (e) =>{
        
        let action = this.raycast(e);
       // this.updateOverlayPos(action.selectedPoint);
        switch(parseInt(action.btnIndex)){
            case 1:
           // console.log('lmb');
            if(action.isOnFloor && (!action.isOnWall)){
               // console.log('move to ',action.selectedPoint);
                this.moveTo = action.selectedPoint.clone();
            }
            break;
            default:
          //  console.log('default',action);
            break;
        }
    }

    displayInHUD = (data) =>{
       console.log(data);
        let msg = '<h3>Created By '+data.creator+'</h3><p>'+data.description+'</p>'
        console.log('msg: ',msg);
        this.updateOverlayMsg(msg);
        this.convertToCanvas();
    }

    convertToCanvas = (mesh) =>{
        let that = this;
        domtoimage.toPng(document.querySelector("#hud-content")).then(function (dataUrl) {
            that.hud.updateHUDTexture(dataUrl)
        });

    }

    updateOverlayPos = (pos) =>{
        let posText = 'x: '+pos.x+' y: '+pos.y+' z: '+pos.z;
        document.querySelector('span#pos-display').innerHTML = posText;
     /*   console.log('camera status');
        console.log(this.camera);
        console.log('controls status');
        console.log(this.controls)        */
    }

    updateOverlayMsg = (msg) =>{
        document.querySelector('#hud-content').innerHTML = msg;
     
    }

    raycast = ( e ) => {
        var isRightMB;
        let isOnFloor = false;
        let isOnWall = false;
        let btnIndex = 0;
        e = e || window.event;

        if ("which" in e) { // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
            isRightMB = e.which == 3; 
            if(isRightMB){
                 btnIndex = 2;
            } else {
                btnIndex = e.which;
            };
            //console.log(e.which);
        } else if ("button" in e){  // IE, Opera 
            console.log(e.button);
            isRightMB = e.button == 2; 
            if(isRightMB){
                 btnIndex = 1;
            } else {
                 btnIndex = e.button;
            }
        };
    // Step 1: Detect light helper
        //1. sets the this.mouse position with a coordinate system where the center
        //   of the screen is the origin
        this.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and this.mouse coordinates
        this.raycaster.setFromCamera( this.mouse, this.camera );    

        //3. compute intersections (note the 2nd parameter)
        var intersects = this.raycaster.intersectObjects( this.scene.children, true );
        let floorLevel;
        if(intersects[0]){
            isOnFloor = this.isOnFloor(intersects[0].point);
            isOnWall = this.isOnWall(intersects[0].point);
        };
        return {
            isOnFloor: isOnFloor,
            isOnWall: isOnWall,
            btnIndex: btnIndex,
            selectedPoint: (intersects[0])?intersects[0].point:null,
            selection: (intersects[0])?intersects[0]:null,
        }
    }

    isOnFloor = (selectedPoint, meshToCheck) =>{

        let origin = selectedPoint.clone();
            origin.setY(origin.y+1);

        let dest = selectedPoint.clone();
            dest.setY(-1000); //raycast downwards from selected point.
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        this.raycaster.set(origin,dir);
        var intersects = this.raycaster.intersectObjects( this.scene.children, true );
        let hit;
        if(intersects[0]){   
            hit = intersects[0];

            if(hit.point.y===selectedPoint.y){
                return true;
            } else {
                return false;
            };
            //this.scene.add(new THREE.ArrowHelper( this.raycaster.ray.direction, this.raycaster.ray.origin, 1000, Math.random() * 0xffffff ));

            return hit.point.y;
        } else {
            return false;
        }
   


    }

isOnWall = (selectedPoint, meshToCheck) =>{
        let origin = selectedPoint.clone();
         //   origin.setZ(origin.z-1);
        let dest = selectedPoint.clone();
            dest.setZ(this.player.position.z); //raycast downwards from selected point.
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        this.raycaster = new THREE.Raycaster();
        this.raycaster.set(origin,dir);
        var intersects = this.raycaster.intersectObjects( this.scene.children, true );
        let hit;
        if(intersects[0]){   
            hit = intersects[0];
            if(hit.point.z===selectedPoint.z){
                return true;
            } else {
                //console.log('hit.point.z',hit.point.z,'selectedPoint.z',selectedPoint.z)
                return false;
            };
           // this.scene.add(new THREE.ArrowHelper( this.raycaster.ray.direction, this.raycaster.ray.origin, 1000, Math.random() * 0xffffff ));
        } else {
            return false;
        }
    }

    placeNFT = (pos, nftPostHashHex) =>{
        let item = this.inventory.getItemByHash(nftPostHashHex);
        if(item){
            item.place(pos);
          //  console.log('item placed');     
        } else {
            console.log('item not in inventory: ',nftPostHashHex);
        }

    }

    placeActiveItem = (pos) =>{
        let item = this.inventory.getActiveItem();
        if(item){
            item.place(pos);
            console.log('item placed');     
        } else {
            console.log('no active item');
        }

    } 
    showOverlay =()=>{

        let that = this;
        let overlay = new NFTViewerOverlay({
            el: this.parentDivEl,
            handlers: {
                floor: (checked)=>{
                    if(checked){
                        that.addScenery();
                    } else {
                        that.unRestrictCamera();
                        that.removeFloor();
                    }
                },
                sky: (checked)=>{
                    if(checked){
                        that.addSky();
                    } else {
                        that.removeSky();
                    }
                }
            }
        })        
    }

    getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    loadSkyBox = (boxname) => {
        if(this.config.skyboxPath===''){
            return false;
        };

        let skybox ='';

        const loader = new THREE.CubeTextureLoader();
        let skyboxPath = this.config.skyboxPath+'/'+boxname+'/';
        loader.setPath(skyboxPath);

        switch(boxname){
            case 'bluecloud':
                skybox = loader.load([
                            'bluecloud_ft.jpg',
                            'bluecloud_bk.jpg',
                            'bluecloud_up.jpg',
                            'bluecloud_dn.jpg',
                            'bluecloud_rt.jpg',
                            'bluecloud_lf.jpg']);
            break;
            case 'yellowcloud':
                skybox = loader.load([
                            'yellowcloud_ft.jpg',
                            'yellowcloud_bk.jpg',
                            'yellowcloud_up.jpg',
                            'yellowcloud_dn.jpg',
                            'yellowcloud_rt.jpg',
                            'yellowcloud_lf.jpg']);
            break;
            case 'browncloud':
                skybox = loader.load([
                            'browncloud_ft.jpg',
                            'browncloud_bk.jpg',
                            'browncloud_up.jpg',
                            'browncloud_dn.jpg',
                            'browncloud_rt.jpg',
                            'browncloud_lf.jpg']);
            break;
            case 'lightblue':
                skybox = loader.load([
                            'right.png',
                            'left.png',
                            'top.png',
                            'bot.png',
                            'front.png',
                            'back.png']);
            break;             
            case 'blue':
                skybox = loader.load([
                            'bkg1_right.png',
                            'bkg1_left.png',
                            'bkg1_top.png',
                            'bkg1_bot.png',
                            'bkg1_front.png',
                            'bkg1_back.png']);
            break;
        }
        
        return skybox;
    }

    addEventListenerResize = () =>{

        window.addEventListener('resize', this.resize.bind(this), false);
    }

    addEventListenerContextLost = () =>{

//        this.renderer.context.canvas.addEventListener("webglcontextlost", this.onLostContext);
    }

    onLostContext = (e)=>{
        e.preventDefault();
        console.log('lost!', e);
        this.renderer.setAnimationLoop(null);
    }

    addEventListenerExitFullScreen = () =>{
        if (document.addEventListener){
            document.addEventListener('webkitfullscreenchange', this.fsChangeHandler, false);
            document.addEventListener('mozfullscreenchange', this.fsChangeHandler, false);
            document.addEventListener('fullscreenchange', this.fsChangeHandler, false);
            document.addEventListener('MSFullscreenChange', this.fsChangeHandler, false);
        }
    }

    fsChangeHandler = () =>{
            if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== undefined) {
        } else {
          var elem = this.renderer.domElement;
            elem.style.width = 'auto';
            elem.style.height = 'auto';
            this.isFullScreen = false;            
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        }
    
    }

    resize = () =>{
        if (!this.renderer.xr.isPresenting) {
            this.resizeCanvas();
        };
    }
    resizeCanvas = () =>{
        if(this.isFullScreen){
            let canvasWidth = screen.width;
            let canvasHeight = screen.height;
            this.camera.aspect = canvasWidth/canvasHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvasWidth,canvasHeight);
        } else {
            this.parentDivElWidth = this.parentDivEl.offsetWidth;
            this.parentDivElHeight = this.parentDivEl.offsetHeight;                       
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        };

        this.controls.update();
    }

        
        
    animate = () =>{
        console.log('start animation loop');
/*
        window.setInterval(()=>{
        if (this.renderer.xr.isPresenting === true) {
            this.vrControls.checkControllers();
        }             *
    },1)*/


        this.renderer.setAnimationLoop(this.render);
    }
    
    render = () =>{
         if (this.renderer.xr.isPresenting === true) {
            this.vrControls.checkControllers();
        }  

        const delta = Math.min( this.clock.getDelta(), 0.1 );

        this.updateObjects(delta);

            if ( params.firstPerson ) {

            this.controls.maxPolarAngle = Infinity;
            this.controls.minDistance = 1e-4;
            this.controls.maxDistance = 1e-4;

            } else {

                this.controls.maxPolarAngle = Math.PI / 2;
                this.controls.minDistance = 1;
                this.controls.maxDistance = 20;

            }

              if ( this.collider ) {
//console.log('got this.collider');
                this.collider.visible = params.displayCollider;
             //   visualizer.visible = params.displayBVH;

                const physicsSteps = params.physicsSteps;

                for ( let i = 0; i < physicsSteps; i ++ ) {

                    if (this.renderer.xr.isPresenting === true) {
                        if(this.vrType==="walking"){
                           this.updatePlayerVR( delta / physicsSteps );
                        }
                    } else {
                       this.updatePlayer( delta / physicsSteps );
                    }

                }

            } else {
  //              console.log('no this.collider');
            }

            // TODO: limit the camera movement based on the this.collider
            // raycast in direction of camera and move it if it's further than the closest point

          //  this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.hud.render();

    }

    updateObjects = (deltaTime) =>{
        this.objectsInMotion.forEach((item)=>{
            item.mesh.position.addScaledVector( item.velocity, deltaTime );
            item.velocity.y += (params.gravity/1.5) * deltaTime;
            if(item.nftPostHashHex!="7630999a903663b368d1d2c2b86e39e77f30625eaca646b43b180e2be0ba4428"){
                item.mesh.rotation.y -= 0.005;     
                item.mesh.rotation.x -= 0.005;     
                item.mesh.rotation.z -= 0.005;     
            }

        })
    }

     fitCameraToMesh=(loadedItem)=>{

        console.log('fitCameraToMesh: ', loadedItem);
        const box = new THREE.Box3().setFromObject(loadedItem.mesh);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * this.camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / this.camera.aspect;

        const distance = this.config.fitOffset * Math.max(fitHeightDistance, fitWidthDistance);
        this.distance = distance;

        const direction = this.controls.target.clone()
            .sub(this.camera.position)
            .normalize()
            .multiplyScalar(distance);

        this.controls.maxDistance = distance * 10;
        this.controls.target.copy(center);

        this.camera.near = distance / 100;
        this.camera.far = distance * 100;
        this.camera.updateProjectionMatrix();

        this.camera.position.copy(this.controls.target).sub(direction);
        this.controls.update();
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

    updateUI = (el, modelUrl) => {

        let linkCtr = this.config.linkCtrCls;
            linkCtr = document.querySelector('.'+linkCtr);

        let linkView3D = this.createLinkView3D();
        this.addClickListener3D(linkCtr, linkView3D, modelUrl);

        let linkViewFull = this.createLinkFullScreen()
        this.addClickListenerFullScreen(linkCtr, linkViewFull, modelUrl);

        let linkViewVR = this.createLinkVR()
        this.addClickListenerVR(linkCtr, linkViewVR, modelUrl)

        var viewerEl = linkCtr;
        viewerEl.innerHTML = '';
        viewerEl.appendChild(linkView3D);
        viewerEl.appendChild(linkViewFull);
        viewerEl.appendChild(linkViewVR);

        el.setAttribute('model-status','available');
    }

    createLinkView3D = () =>{
        var a = document.createElement('a');
        var linkText = document.createTextNode(this.config.linkText);
            a.appendChild(linkText);
            a.title = "View in 3D";
            a.href = "#";
            a.classList = "btn d3d-btn view-3d-btn";
        return a;
    }

    createLinkFullScreen = () =>{
        var a = document.createElement('a');
        var linkText = document.createTextNode('Full Screen');
            a.appendChild(linkText);
            a.title = "Fullscreen";
            a.href = "#";
            a.classList = "btn d3d-btn view-fullscreen-btn";
            a.setAttribute('style','display:none;');
        return a;
    }    

    createLinkVR = () =>{
        var a = document.createElement('a');
        var linkText = document.createTextNode('View in VR');
            a.appendChild(linkText);
            a.title = "View in VR";
            a.href = "#";
            a.classList = "btn d3d-btn view-vr-btn";
            a.setAttribute('style','display:none;');
        return a;
    }    
    

  openFullscreen =()=> {
      var elem = this.renderer.domElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
      }
      elem.style.width = '100%';
      elem.style.height = '100%';
      this.isFullScreen = true;
    }

    addClickListener3D = (ctr, el, modelUrl) => {
        let that = this;
        let targetEl = document.querySelector('.'+this.config.previewCtrCls);
        let previewImg = targetEl.querySelector('img');
        console.log('previewImg',previewImg);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            that.updateLink(el,'Loading..');
            that.initContainer(targetEl);
            let item = that.initItemForModel(modelUrl);
            that.mesh = item.model;
            let newPos = new THREE.Vector3(0,3.7,0);
            item.place(newPos).then((model,pos)=>{
                that.resizeCanvas();
                previewImg.style.display = 'none';
                this.renderer.domElement.style.display = 'inline-block';
            });
            el.setAttribute('style','display:none;');
            el.parentNode.getElementsByClassName('view-fullscreen-btn')[0].setAttribute('style','display:inline-block;');
            el.parentNode.getElementsByClassName('view-vr-btn')[0].setAttribute('style','display:inline-block;');
            that.start3D()

        });     
    }

    loadModel = (opts) =>{

        let that = this;
        return new Promise((resolve,reject)=>{

            let hideElOnLoad = opts.hideElOnLoad;
            let modelUrl = opts.modelUrl;
            let containerId = opts.containerId;
            let container = document.getElementById(containerId);
                 
            that.initContainer(container);
           
            let item = that.initItemForModel(modelUrl);
                that.mesh = item.model;
            let newPos = new THREE.Vector3(0,3.7,0);
            
            item.place(newPos).then((model,pos)=>{
                that.resizeCanvas();
                let loadingElement = document.querySelector('#'+hideElOnLoad);
                if(loadingElement){
                    loadingElement.style.display = 'none';              
                };
                this.renderer.domElement.style.display = 'inline-block';
                resolve(item, model, pos);
            });
        });

    }

    loadNFT = (opts) =>{
        // load an item which is a minted nft
        let that = this;
        return new Promise((resolve,reject)=>{

            let hideElOnLoad = opts.hideElOnLoad;
            let nftPostHash = opts.nftPostHash;
            let containerId = opts.containerId;
            let container = document.getElementById(containerId);
            
            that.initContainer(container);
           
            let item = that.initItem(nftPostHash);
                that.mesh = item.model;
            let newPos = new THREE.Vector3(0,1.2,0);
            
            item.place(newPos).then((model,pos)=>{
                that.resizeCanvas();
                let img = document.querySelector('#'+hideElOnLoad);
                img.style.display = 'none';
                this.renderer.domElement.style.display = 'inline-block';
                resolve(item, model, pos);
            });
        });


    }

    start3D = () =>{

        // start animation / controls
        //this.parentDivEl.children[0].setAttribute('style','display:none;');                    
      //  this.renderer.domElement.setAttribute('style','display:inline-block;');            

      //  this.showOverlay();
        
        //this.animate();        
    }


    initInventory = (options) =>{
        console.log('initInventory: this.config.imageProxyUrl',this.config.imageProxyUrl);
        let items =[];
        if(options.items){
            items = options.items;
        };
        this.inventory = new D3DInventory({ chainAPI: this.config.chainAPI,
                                            imageProxyUrl: this.config.imageProxyUrl,    
                                            items: items,
                                            scene: this.scene,
                                            loader: this.loader,
                                            loaders: this.loaders,
                                            width: this.config.sceneryOptions.scaleModelToWidth,
                                            depth: this.config.sceneryOptions.scaleModelToDepth,
                                            height: this.config.sceneryOptions.scaleModelToHeight,
                                            modelsRoute: this.config.modelsRoute,
                                            nftsRoute: this.config.nftsRoute
                                        });
        this.sceneInventory = null;
        if(options.sceneAssets){
            this.layoutPlotter = new LayoutPlotter({
                                                 camera: this.camera,
                                                 scene: this.scene,
                                                 sceneryLoader: this.sceneryLoader});  

            this.sceneInventory = new D3DInventory({
                                            chainAPI: this.config.chainAPI,
                                            imageProxyUrl: this.config.imageProxyUrl,    
                                            items: options.sceneAssets,
                                            scene: this.scene,
                                            loader: this.loader,
                                            loaders: this.loaders,
                                            width: 3,
                                            depth: 3,
                                            height: 3,
                                            modelsRoute: this.config.modelsRoute,
                                            nftsRoute: this.config.nftsRoute,
                                            layoutPlotter: this.layoutPlotter
                                        });                    
        }
        
    }

    initItem = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';
        let itemParams = {
            three: THREE,
            scene: this.scene,
            height: this.config.scaleModelToHeight,
            width: this.config.scaleModelToWidth,
            depth: this.config.scaleModelToDepth,
            loader: this.loaders.getLoaderForFormat(opts.format),
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: nftsRoute

        };
        if(opts.nftRequestParams){
            let nftRequestParams = opts.nftRequestParams;

            Object.keys(nftRequestParams).forEach((key, index) => {
                params.push(key+'='+nftRequestParams[key]);
            });
            paramString = params.join('&');
            itemParams.nftsRoute = this.config.nftsRoute +'?' +paramString;
        };

        let item = new Item(itemParams);                

        return item;

    }

    initItemForModel = (modelUrl) =>{
        let urlParts = modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];

        let item = new Item({
            three: THREE,
            loader: this.loaders.getLoaderForFormat(extension),
            scene: this.scene,
            height: this.config.scaleModelToHeight,
            width: this.config.scaleModelToWidth,
            depth: this.config.scaleModelToDepth,
            modelUrl: modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:extension
        });
        return item;

    }

    initAvatarForModel = (modelUrl, size) =>{
        let urlParts = modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];

        if(!size){ // default size for avatar

            size = {
                width: 1,
                height: 1,
                depth: 1
            }
        }

        let item = new Item({
            three: THREE,
            loader: this.loaders.getLoaderForFormat(extension),
            scene: this.scene,
            height: size.height,
            width: size.width,
            depth: size.depth,
            modelUrl: modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:extension
        });
        return item;

    }    

    initVR = () =>{

        let that = this;
        
        VRButton.registerSessionGrantedListener();        
        let vrBtnOptions = { btnCtr : 'div.view-vr-btn',
                             viewer: this,
                             onStartSession: ()=>{
                                if(!this.player){
                                    if(this.config.firstPerson){
                                        this.initPlayerFirstPerson();
                                    } else {
                                        this.initPlayerThirdPerson();
                                    };
                                };
                              /*  console.log('start session walking');
                                console.log('player rotation', this.player.rotation);
                                console.log('camera.rotation', this.camera.rotation);
                                console.log('character rotation',this.character.rotation);*/
                                let vrType = that.getVrTypeFromUI();
                                //console.log('180 degrees later: ',that.camera.rotation);

                                that.buildDolly(vrType);                                
                            } }
        let vrButtonEl = VRButton.createButton(this.renderer, vrBtnOptions);
        console.log('initVR');
        console.log(vrButtonEl);

    }
    
    getVrTypeFromUI = () =>{
        let selectedVrType = 'walking';
        let vrTypeSelect = document.getElementById('vrType');
        if(vrTypeSelect){
            selectedVrType = vrTypeSelect.options[vrTypeSelect.selectedIndex].value;
        };
        return selectedVrType;
    }

    setVrType = (vrType) => {
        console.log('vrType: ',vrType);
        this.vrType = vrType;
    }

    buildDolly = (vrType) =>{
        if(vrType){
            this.setVrType(vrType);
        };
        console.log('buildDolly for ',this.vrType);        
        this.vrControls = new VRControls({  scene:this.scene,
                                            renderer: this.renderer,
                                            camera: this.camera,
                                            player: this.player,
                                            playerStartPos: this.config.playerStartPos,
                                            vrType: this.vrType,
                                            moveUp: (data)=>{
                                                return;
                                            },
                                            moveDown:(data)=>{
                                                return;
                                            },
                                            moveLeft:(data)=>{
                                                lftPressed = true;
                                            },
                                            moveRight:(data)=>{
                                                rgtPressed = true;
                                                return;
                                            },
                                            moveForward:(data)=>{
                                                fwdPressed = true;
                                                return;
                                            },
                                            moveBack:(data)=>{
                                                bkdPressed = true;
                                                return;

                                            },
                                            rotateLeft: (data, value)=>{
                                                this.dolly.rotateY(THREE.MathUtils.degToRad(Math.abs(value)));
                                                this.player.rotateY(THREE.MathUtils.degToRad(Math.abs(value)));
                                                return;
                                            },
                                            rotateRight: (data, value)=>{
                                                this.dolly.rotateY(-THREE.MathUtils.degToRad(Math.abs(value)));
                                                this.player.rotateY(-THREE.MathUtils.degToRad(Math.abs(value)));
                                                return;
                                            }
                                        });
            this.dolly = this.vrControls.buildControllers();
    }

    addScenery = () =>{
        let that = this;
        if(this.sceneryMesh){
            this.scene.add(this.sceneryMesh);
        } else {
            let modelURL = this.config.sceneryPath;
            that.loader = this.loaders.getLoaderForFormat('gltf');
            that.loader.load(modelURL, (model)=> {
                let gltfMesh = null;
                gltfMesh = model.scene;
                gltfMesh.position.set(0,0,0); 
                gltfMesh.scale.set(0.2,0.2,0.2);    
                that.sceneryMesh = gltfMesh;
                that.scene.add(that.sceneryMesh);
                this.restrictCameraToRoom();

            })            
        }
        
    }

    removeScenery = () =>{
        if(this.sceneryMesh){
            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
        }else {
            console.log('no scenerymesh to remove');
        }
    }    

    removeFloor = () =>{
        if(this.sceneryMesh){
                    console.log('removeScenery: OK');

            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
        } else {
            console.log('no scenerymesh to remove');
        }
    }

    addClickListenerFullScreen = (ctr, el, modelUrl) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            that.openFullscreen();
            that.resizeCanvas(true);
        });     
    }    

    addClickListenerVR = (ctr, el, modelUrl) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            that.openVR();
            //that.resizeCanvas(true);
        });     
    }   

    openVR = (el) =>{


    }
    updateLink = (linkEl, linkText)=> {
        linkEl.text = linkText;
    }

    findElFrom = (elClassName, ctr) =>{
        let targetEl = null;
        let matchedEls = ctr.getElementsByClassName(elClassName);
        if(matchedEls.length>0){
            targetEl = matchedEls[0];
        };
        return targetEl;
    }

    initNFTs = (container)=>{
        if(!container){
            container = document.body;
        };
    
        let nftContainers = Array.from(container.getElementsByClassName(this.config.ctrClass));

        nftContainers.forEach(this.initModel);        
    }

    initModel = (el) => {
        const that = this;
        let modelStatus = el.getAttribute('model-status');
        if(!modelStatus){
            modelStatus = 'requested';
            el.setAttribute('model-status',modelStatus);
        };
        if(modelStatus!=='available'){
            let nftPostHash = el.getAttribute(this.config.nftDataAttr);
            let url = '';
            if(that.config.modelsRoute.indexOf('http')===-1){
                url = '/'+this.config.nftsRoute+'/'+nftPostHash;
            } else {
                url = this.config.nftsRoute+'/'+nftPostHash;
            };
            fetch(url,{ method: "post"})
            .then(response => response.json())
            .then((data)=>{ 

                if(data !== undefined){
                    let fullUrl = '';
                    if(that.config.modelsRoute.indexOf('http')===-1){
                        // not a remote server so add a slash for local path
                        fullUrl = '/'+that.config.modelsRoute+'/'+nftPostHash+data.modelUrl;
                    } else {
                        fullUrl = that.config.modelsRoute+'/'+nftPostHash+data.modelUrl;
                    };
                    this.updateUI(el, fullUrl);
                };

            }).catch(err => {
                console.log(err);
                console.log(response);
            });
        };

    }

initPlayerFirstPerson = () => {

    let that = this;
    let playerLoader = new GLTFLoader();
    let newPos = null;
    let playerFloor = 0;
    let playerStartPos;
    that.player = new THREE.Group();

    if(this.sceneryLoader.playerStartPos){
        playerStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z);
    } else {
        playerFloor = this.sceneryLoader.findFloorAt(new THREE.Vector3(0,0,0), 2, -1);
        playerStartPos = new THREE.Vector3(0,playerFloor,0);
    };

    that.player = new THREE.Group();
    that.player.position.copy(playerStartPos);
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.0, 1.0, 1.0, 10, 0.5),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );

    that.character.geometry.translate( 0, -1, 0 );
    that.character.capsuleInfo = {
        radius: 0.5,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    

    that.player.add(that.character);
    that.character.updateMatrixWorld();
    that.scene.add( that.player );
    that.player.updateMatrixWorld();
    that.addListeners();
}

initPlayerThirdPerson = () => {

    let that = this;
    let playerLoader = new GLTFLoader();
    let item = that.initItemForModel('./characters/AstridCentered.glb');
    this.mesh = item.model;
    let newPos = null;
    let playerFloor = 0;
    if(this.config.playerStartPos){
        let playerStartPos = new THREE.Vector3(this.config.playerStartPos.x,this.config.playerStartPos.y,this.config.playerStartPos.z);        
        newPos = new THREE.Vector3(0,playerFloor,0);

    } else {
        playerFloor = this.sceneryLoader.findFloorAt(new THREE.Vector3(0,0,0), 2, -1);
        newPos = new THREE.Vector3(0,playerFloor,0);

    };
    
    that.player = new THREE.Group();
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.0, 1.0, 1.0, 10, 0.5),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );

    that.character.geometry.translate( 0, -1, 0 );
    that.character.capsuleInfo = {
        radius: 0.5,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    
    item.place(newPos).then((model,pos)=>{
   
         console.log('placed model: ');
        // character
       
       // this.character.copy(pos);
        model.position.setY(-1.4);
        that.player.add(model);
        model.updateMatrixWorld();
        that.player.add(that.character);
        that.character.updateMatrixWorld();
        that.scene.add( that.player );
        that.player.updateMatrixWorld();
        that.addListeners();   
    });
}

 updatePlayer = ( delta )=> {
    this.playerVelocity.y += this.playerIsOnGround ? 0 : delta * params.gravity;
    this.player.position.addScaledVector( this.playerVelocity, delta );

    // move the player
    const angle = this.controls.getAzimuthalAngle();
    if ( fwdPressed ) {

        this.tempVector.set( 0, 0, - 1 ).applyAxisAngle( this.upVector, angle );
        //let angleToCamera = Math.atan2( ( this.player.position.x - this.playerVelocity.x ), ( this.player.position.z - this.playerVelocity.z ) );
       // this.player.rotation.y = angleToCamera;  
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        //this.player.lookAt(nextPos);
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );
    }

    if ( bkdPressed ) {

        this.tempVector.set( 0, 0, 1 ).applyAxisAngle( this.upVector, angle );
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        //this.player.lookAt(nextPos);      
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );

    }

    if ( lftPressed ) {

        this.tempVector.set( - 1, 0, 0 ).applyAxisAngle(  this.upVector, angle );
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        //this.player.lookAt(nextPos);
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );

    }

    if ( rgtPressed ) {

        this.tempVector.set( 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        //this.player.lookAt(nextPos);
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );

    }
    if(this.moveTo){
        console.log('moving from ',this.player.position);
        this.moveTo.setY(this.player.position.y);
        console.log('moving to selectedPoint: ',this.moveTo);

        this.player.position.copy(this.moveTo);
        this.moveTo = false;
    };
    this.player.updateMatrixWorld();

    // adjust player position based on collisions
    const capsuleInfo = this.character.capsuleInfo;
    this.tempBox.makeEmpty();
    this.tempMat.copy( this.collider.matrixWorld ).invert();
    this.tempSegment.copy( capsuleInfo.segment );

    // get the position of the capsule in the local space of the this.collider
    this.tempSegment.start.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );
    this.tempSegment.end.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );

    // get the axis aligned bounding box of the capsule
    this.tempBox.expandByPoint( this.tempSegment.start );
    this.tempBox.expandByPoint( this.tempSegment.end );

    this.tempBox.min.addScalar( - capsuleInfo.radius );
    this.tempBox.max.addScalar( capsuleInfo.radius );

    this.collider.geometry.boundsTree.shapecast( {

        intersectsBounds: box => box.intersectsBox( this.tempBox ),

        intersectsTriangle: tri => {

            // check if the triangle is intersecting the capsule and adjust the
            // capsule position if it is.
            const triPoint = this.tempVector;
            const capsulePoint = this.tempVector2;

            const distance = tri.closestPointToSegment( this.tempSegment, triPoint, capsulePoint );
            if ( distance < capsuleInfo.radius ) {

                const depth = capsuleInfo.radius - distance;
                const direction = capsulePoint.sub( triPoint ).normalize();

                this.tempSegment.start.addScaledVector( direction, depth );
                this.tempSegment.end.addScaledVector( direction, depth );

            }

        }

    } );

    // get the adjusted position of the capsule this.collider in world space after checking
    // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
    // the origin of the player model.
    const newPosition = this.tempVector;
    newPosition.copy( this.tempSegment.start ).applyMatrix4( this.collider.matrixWorld );

    // check how much the this.collider was moved
    const deltaVector = this.tempVector2;
    deltaVector.subVectors( newPosition, this.player.position );

    // if the player was primarily adjusted vertically we assume it's on something we should consider ground
    this.playerIsOnGround = deltaVector.y > Math.abs( delta * this.playerVelocity.y * 0.25 );

    const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
    deltaVector.normalize().multiplyScalar( offset );

    // adjust the player model
    this.player.position.add( deltaVector );

    if ( ! this.playerIsOnGround ) {

        deltaVector.normalize();
        this.playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( this.playerVelocity ) );

    } else {

        this.playerVelocity.set( 0, 0, 0 );

    }

    // adjust the camera
    this.camera.position.sub( this.controls.target );
    let playerx = this.player.position.x;
    let playery = this.player.position.y+1;
    let playerz = this.player.position.z;
    //this.camPos.set(playerx,(playery),playerz);
    this.controls.target.set(playerx,(playery),playerz);
    this.camera.position.add( this.controls.target );
    if (this.renderer.xr.isPresenting) {
        if(this.player.position){
            
            if(this.player.position.x){
           let playerx = this.player.position.x;
           let playery = this.player.position.y;
           let playerz = this.player.position.z;

        //   console.log('playerpos');
          // console.log(playerx,playery,playerz);
         
            this.dolly.position.set(playerx,(playery+0.15),playerz);

          // playerPos.y = playerPos.y + 1.5;
            //this.camera.position.set(playerPos);
        }
        };
    };
    // if the player has fallen too far below the level reset their position to the start
    if ( this.player.position.y < - 25 ) {

        this.reset();

    }

}


 updatePlayerVR = (delta) =>{
        this.playerVelocity.y += this.playerIsOnGround ? 0 : delta * params.gravity;
        let speedFactor = params.playerSpeed * delta *10;

      //  this.player.position.addScaledVector( this.playerVelocity, delta );
        if ( fwdPressed ) {
            //this.tempVector.set( 0, 0, - 1 ).applyAxisAngle( this.upVector, angle );
            this.player.translateZ(speedFactor );
        }

        if ( bkdPressed ) {

            //this.tempVector.set( 0, 0, 1 ).applyAxisAngle( this.upVector, angle );
            this.player.translateZ(-speedFactor );
        }

        if ( lftPressed ) {

         //   this.tempVector.set( - 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
            this.player.translateX(speedFactor);
        }

        if ( rgtPressed ) {

           // this.tempVector.set( 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
            this.player.translateX(-speedFactor );
        }
        this.player.updateMatrixWorld();

        // adjust this.player position based on collisions
        const capsuleInfo = this.character.capsuleInfo;
        this.tempBox.makeEmpty();
        this.tempMat.copy( this.collider.matrixWorld ).invert();
        this.tempSegment.copy( capsuleInfo.segment );

        // get the position of the capsule in the local space of the collider
        this.tempSegment.start.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );
        this.tempSegment.end.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );

        // get the axis aligned bounding box of the capsule
        this.tempBox.expandByPoint( this.tempSegment.start );
        this.tempBox.expandByPoint( this.tempSegment.end );

        this.tempBox.min.addScalar( - capsuleInfo.radius );
        this.tempBox.max.addScalar( capsuleInfo.radius );

        this.collider.geometry.boundsTree.shapecast( {

            intersectsBounds: box => box.intersectsBox( this.tempBox ),

            intersectsTriangle: tri => {

                // check if the triangle is intersecting the capsule and adjust the
                // capsule position if it is.
                const triPoint = this.tempVector;
                const capsulePoint = this.tempVector2;

                const distance = tri.closestPointToSegment( this.tempSegment, triPoint, capsulePoint );
                if ( distance < capsuleInfo.radius ) {

                    const depth = capsuleInfo.radius - distance;
                    const direction = capsulePoint.sub( triPoint ).normalize();

                    this.tempSegment.start.addScaledVector( direction, depth );
                    this.tempSegment.end.addScaledVector( direction, depth );

                }

            }

        } );

        // get the adjusted position of the capsule collider in world space after checking
        // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
        // the origin of the this.player model.
        const newPosition = this.tempVector;
        newPosition.copy( this.tempSegment.start ).applyMatrix4( this.collider.matrixWorld );

        // check how much the collider was moved
        const deltaVector = this.tempVector2;
        deltaVector.subVectors( newPosition, this.player.position );

        // if the this.player was primarily adjusted vertically we assume it's on something we should consider ground
        this.playerIsOnGround = deltaVector.y > Math.abs( delta * this.playerVelocity.y * 0.25 );

        const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
        deltaVector.normalize().multiplyScalar( offset );

        // adjust the this.player model
        this.player.position.add( deltaVector );

        if ( ! this.playerIsOnGround ) {

            deltaVector.normalize();
           this.playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( this.playerVelocity ) );

        } else {

            this.playerVelocity.set( 0, 0, 0 );

        }
            if(this.player.position){
                
                if(this.player.position.x){
                    let playerx = this.player.position.x;
                    let playery = this.player.position.y;
                    let playerz = this.player.position.z;
         
                    this.dolly.position.set(playerx,(playery+0.5),playerz);
                    this.dolly.rotation.copy(this.player.rotation);
                    this.player.rotateY(Math.PI);
                }
        };
        


        // adjust the this.camerainit
    //    this.camera.position.sub( this.controls.target );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );

        // if the this.player has fallen too far below the level reset their position to the start
        if ( this.player.position.y < - 25 ) {

            this.reset();

        };
        fwdPressed = false;
        bkdPressed = false;
        rgtPressed = false;
        lftPressed = false;
    }

    reset = ()=> {
        this.playerVelocity.set( 0, 0, 0 );
        this.player.position.set( 0, 5, 5 );
        this.camera.position.set(0, 6.5, 5);
       // this.camera.position.set( this.player.position );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );
   //     this.controls.update();

    }    
};

export {D3DSpaceViewer}