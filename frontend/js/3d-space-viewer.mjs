export const name = 'd3dspaceviewer';
// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';
import anime from 'animejs';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {PlayerVR, AudioClip, Item, ItemVRM, LoadingScreen, HUDBrowser, HUDVR, SceneryLoader, Lighting, LayoutPlotter, D3DLoaders, D3DInventory, NFTViewerOverlay, VRButton, VRControls } from '3d-nft-viewer';
let clock, gui, stats, delta;
let environment, visualizer, player, controls, geometries;
let playerIsOnGround = false;
let fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false, rotlftPressed = false, rotRgtPressed = false;
let nextPos = new THREE.Vector3();

const params = {
    debug: false,
    firstPerson: true,
    visualizeDepth: 10,
    gravity: - 30,
    playerSpeed: 8,
    physicsSteps: 10,
    useShowroom: true};

 export default class D3DSpaceViewer {
    
    constructor(config) {

        let defaults = {
                    animations: ['/mixamo/Arm_Stretching.fbx', '/mixamo/Looking_Around.fbx','/mixamo/Strut_Walking.fbx','/mixamo/Victory.fbx'],            
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
                    lookAtStartPos: {x:0,y:2,z:0}
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
        this.initLoader(this.config.owner);
        this.dirCalc = new THREE.Vector3(1, 1, 1);
        this.newDir = new THREE.Vector3(1, 1, 1);
        this.ghostCaught = false;
        this.actionTargetItem = null;
        this.actionTargetMesh = null;
        this.animations = [];
        this.audioListener = new THREE.AudioListener();
        this.controlProxy = {};

    }

    loadUIAssets = () =>{
        this.loadDiamond();
        this.loadHeart();
    }

    loadDiamond = () =>{
        let that = this;

        this.uiAssets = [];

        let itemConfig = {  scene: this.scene,
                            format: 'glb',
                            height:0.5,
                            width:0.5,
                            depth:0.5,
                            modelUrl:'  https://desodata.azureedge.net/unzipped/4fe3115f676918940b19fbdedaf210ad73979c9858bf7193761a24a900461a76/gltf/normal/diamond-centered.glb',
                            nftPostHashHex:'4fe3115f676918940b19fbdedaf210ad73979c9858bf7193761a24a900461a76'};

        this.uiAssets['diamond'] = this.initItemForModel(itemConfig);
       
        let newPos = new THREE.Vector3(0,1000,0);
        this.uiAssets['diamond'].place(newPos).then((mesh,pos)=>{
            mesh.visible = false;

            that.uiAssets['diamond'].audioGive = new AudioClip({
                path: '/audio/diamond.mp3',
                mesh: mesh,
                camera: this.camera,
                listener: this.audioListener
            });           
        })
    }

    loadHeart = () =>{
        let that = this;
        let itemConfig = {  scene: this.scene,
                            format: 'glb',
                            height:0.5,
                            width:0.5,
                            depth:0.5,

                            modelsRoute: this.config.modelsRoute,
                            nftsRoute: this.config.nftsRoute,
                            modelUrl:'  https://desodata.azureedge.net/unzipped/29c2c8f77e2a920ced265c1d89143f8959cdb3ee4c495357d943b126a782a0c5/gltf/normal/low_poly_heart.glb',
                            nftPostHashHex:'29c2c8f77e2a920ced265c1d89143f8959cdb3ee4c495357d943b126a782a0c5'};

        this.uiAssets['heart']= this.initItemForModel(itemConfig);

        

        let newPos = new THREE.Vector3(0,1000,0);
        this.uiAssets['heart'].place(newPos).then((mesh,pos)=>{
            mesh.visible = false;

            that.uiAssets['heart'].audioGive = new AudioClip({
                path: '/audio/yeah-7106.mp3',
                mesh: mesh,
                camera: this.camera,
                listener: this.audioListener
            });
     
            that.uiAssets['heart'].audioTake = new AudioClip({
                path: '/audio/aww-8277.mp3',
                mesh: mesh,
                camera: this.camera,
                listener: this.audioListener
            });
        })
    }

    initSpace = (options) =>{
        let sceneryloadingComplete = false
        let nftLoadingComplete = false;
        return new Promise((resolve, reject) => {
            let that = this;
            this.mouse = { x : 0, y : 0 };
            this.getContainer(this.config.el);

            this.initScene();
            this.initCameraPlayer();     
          //  this.loadUIAssets();
            this.initRenderer(this.config.el);
            this.initHUD({scene:that.scene,
                            chainAPI: that.config.chainAPI});
            this.initSkybox();
            this.initLighting();

            this.loadScenery().then(()=>{
                this.initInventory(options);


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
                this.renderer.render(this.scene,this.camera);
                this.animate();
                sceneryloadingComplete = true;

                this.loadingScreen.hide();
                document.getElementById('view-full').style.display='inline-block';
                document.getElementById('give-diamond').style.display='inline-block';
                document.getElementById('give-heart').style.display='inline-block';
                document.getElementById('view-detail').style.display='inline-block';

                  /*  document.querySelectorAll('.d3d-btn-top').forEach((el)=>{
                      el.style.display='inline-block';
                    });*/
                    this.resizeCanvas();
                    if(this.config.devGhost){
                        that.initGhost();
                    } else {
                        if((this.config.showGhost)&&(this.ghosts.length === 0)){
                            let timeDelay = 2000*(Math.floor(Math.random() * 10) + 1);
                            setTimeout(()=>{
                                that.initGhost();
                            },timeDelay)
                        };

                    }



            });

  

        });
    }

    initLoader = (ownerData) =>{
        this.loadingScreen = new LoadingScreen(ownerData);
        this.loadingScreen.render('.loader-ctr');
    }

    initHUD = (opts) => {
        this.hud = new HUDBrowser(opts);
        this.hud.init();
        let that = this;
        if ( 'xr' in navigator ) {
            navigator.xr.isSessionSupported( 'immersive-vr' ).then( function ( supported ) {
                if(supported){
                    that.hudVR = new HUDVR(opts);
                }
            });     
        }

    }

    loadScenery = () =>{
        let that = this;
        return new Promise((resolve,reject)=>{

            let sceneryOptions = {
                ...{visualize:(params.debug),
                    scene : that.scene,
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
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.updateProjectionMatrix(); 
        this.camera.add( this.audioListener );
       
       // this.camera.lookAt(this.config.lookAtStartPos);
    }

    initCamera = () =>{
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/600, 0.01, 100 );
        this.camera.add( this.audioListener );
        
        //Only gotcha. Set a non zero vector3 as the camera position.
//        this.camera.rotation.setX(0);


    }

    initControls = () =>{
        //Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    let playerx = this.player.position.x;
    let playery = this.player.position.y;
    let playerz = this.player.position.z;
    //this.camPos.set(playerx,(playery),playerz);
    this.controls.target.set(playerx,(playery-1),(playerz+0.001));
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
        this.renderer.autoClear =true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        //the following increases the resolution on Quest
        this.renderer.xr.setFramebufferScaleFactor(2.0);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        this.renderer.setClearColor( 0x000000, 1 );
      //  this.renderer.domElement.style.display = 'none';

        if(el){
           el.appendChild(this.renderer.domElement);
        } else {
            console.log('no el so hide');
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
        let dLights = [{name:'above',intensity:0.75},
        {name:'below',intensity:0},
        {name:'left',intensity:0},
        {name:'right',intensity:0},
        {name:'front',intensity:0.5},
        {name:'back',intensity:0.1}];

        this.lights = new Lighting({scene:this.scene,
                                        createListeners: false,
                                        dLights: dLights});   
        //this.addSpotlight();
    }

    initLoaders = () =>{
        //Loader GLTF
        this.loader = this.loaders.getLoaderForFormat(this.config.defaultLoader);      
    }

    addListeners = ()=>{
        document.addEventListener('contextmenu', event => event.preventDefault());
        this.addEventListenerResize();
        this.addEventListenerContextLost();
        this.addEventListenerExitFullScreen();
        this.addEventListenerKeys();
        this.addEventListenerMouseClick();
        this.addEventListenersHUD()
    }    

    addEventListenersHUD = ()=>{
        let that = this;
        let btnDiamond = document.querySelector('#give-diamond');
            this.addClickListenerGiveDiamond(btnDiamond);

        let btnHeart = document.querySelector('#give-heart');
            this.addClickListenerGiveHeart(btnHeart);

        let linkViewFull = document.querySelector('#view-full');  
        this.addClickListenerFullScreen(linkViewFull);

        let btnBuy = document.querySelector('#buy-now');
            this.addClickListenerBuyNow(btnBuy);

        let btnViewPage = document.querySelector('#view-page');
            this.addClickListenerViewPage(btnViewPage);

        let btnViewDetail = document.querySelector('#view-detail');
            this.addClickListenerViewDetails(btnViewDetail);

        let confirmDiamond =  document.querySelector('.confirm-transaction');
            if(confirmDiamond){
                confirmDiamond.addEventListener('click',(e)=>{
                            let diamondCount = this.hud.getDiamondsToSendCount();

                console.log('sending '+diamondCount+' to ',that.hud.selectedItem.config.nft.postHashHex);
                this.config.chainAPI.sendDiamonds(that.hud.selectedItem.config.nft.postHashHex, diamondCount);
            })
        };

    }
    addEventListenerKeys = ()=>{
        let that = this;

        window.addEventListener( 'keydown', function ( e ) {
                switch ( e.code ) {

                    case 'KeyW':
                        fwdPressed = true; 
                        that.controlProxy.dir = 'f';                         

                          break;
                    case 'KeyS':
                        bkdPressed = true; 
                        that.controlProxy.dir = 'b';                         

                        break;
                    case 'KeyD': 
                        rgtPressed = true; 
                        that.controlProxy.dir = 'r';                         
                        break;
                    case 'KeyA': 
                        lftPressed = true; 
                        that.controlProxy.dir = 'l'; 
                        break;
                    case 'KeyO': 

                        that.controlProxy.dir = 'rl';
                        that.controlProxy.rot = 'rl';
                        break;
                    case 'KeyP': 

                        that.controlProxy.dir = 'rr';
                        that.controlProxy.rot = 'rr';
                        break;
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
        let that = this;
        let action = this.raycast(e);
        if(!action.selectedPoint){
            return false;
        };
        switch(parseInt(action.btnIndex)){
            case 1:
            if((action.isOnFloor)&&(!action.isOnWall)){
                let targetPoint = action.selectedPoint.clone();
                let distance = this.player.position.distanceTo(targetPoint);
                console.log('distance: ',distance);
                console.log(targetPoint.x, targetPoint.y, targetPoint.z);
                this.moveTo = targetPoint;
                this.moveTo.setY(this.player.position.y);
        //this.player.position.copy(this.moveTo);
         anime({
                    begin: function(anim) {

                    },
                    targets: this.player.position,
                    x: this.moveTo.x,
                    y: this.moveTo.y,
                    z: this.moveTo.z,
                    loop: false,
                    duration: 250,
                    easing: 'linear',
                    complete: function(anim) {
                     /*   // adjust the camera
                        that.camera.position.sub( that.controls.target );
                        let playerx = that.player.position.x;
                        let playery = that.player.position.y;
                        let playerz = that.player.position.z;
                        that.controls.target.set(playerx,(playery),playerz);
                        that.camera.position.add( that.controls.target );
                      
                        // if the player has fallen too far below the level reset their position to the start
                        if ( that.player.position.y < - 25 ) {

                            that.reset();

                        }*/
                    }                   
                });

                
            } else {
                this.selectTargetNFT(action);
            }
    
            break;            
            case 2:
                this.showSelectedMeshData(action);
            break;
            default:
                this.showSelectedMeshData(action)
            break;
        }
    }

    showSelectedMeshData =(action) =>{
        let item = null;
        if(!action.selection){
            return false;
        };
        if(action.selection.object.userData.owner){
            item = action.selection.object.userData.owner;
        } else {
            item = this.checkForParentOwner(action.selection.object)
        };
        if(item){
            this.selectTargetNFT(action);
            if(item.config.nft){
                let nftDisplayData = item.nftDisplayData;
                if(item.config.spot){
                    nftDisplayData.spot = item.config.spot;
                };
                this.displayInHUD(nftDisplayData);            
            }

            //console.log(action.selection.object.userData.owner.config.nft);
            //console.log('owner: ',action.selection.object.userData.owner.config.nft.profileEntryResponse.username);
            //console.log('body: ',action.selection.object.userData.owner.config.nft.body);

        } else {
            console.log('no owner: ', action.selection.object);
            if(this.hud){
                this.hud.clear();
            }
        }         
    }

    getItemForAction = (action) =>{
        let item = null;
        if(action.selection.object.userData.owner){
            item = action.selection.object.userData.owner;
        } else {
            item = this.checkForParentOwner(action.selection.object)
        };    
        return item;    
    }

    checkForParentOwner = (mesh) =>{
        let ownerFound = false;
        while((mesh.parent)&&(!ownerFound)){
            mesh = mesh.parent;
            if(mesh.userData.owner){
                ownerFound = true;
            }

        }
        if(ownerFound){
            return mesh.userData.owner;
        } else {
            return false;
        }
    }

    selectTargetNFT = (action) =>{
        this.actionTargetMesh = null;
        let that = this;
        let item = this.getItemForAction(action)
        if(item){
            if(item.isGhost){
                this.actionTargetPos = item.getPosition();       
                this.actionTargetItem = item;
                this.targetGhost();
            } else {
                if(item.config){
                    if(!item.isSelected) {
                        this.hud.unSelectItem(); // unselect prev
                        this.config.chainAPI.getHeartStatus(item.config.nft.postHashHex).then((result)=>{
                            that.hud.setSelectedItem(item);
                            that.actionTargetItem = item;
                            that.actionTargetMesh = item.mesh;
                            that.showStatusBar(['diamond-count','select-preview','confirm-not','confirm']);

                            let diamondCountEl = document.querySelector('#d-count');
                            diamondCountEl.innerHTML = String(0);
                            let heartIcon = document.getElementById('heart');

                            if(result){
                                heartIcon.style.display = 'inline-block';
                            } else {
                                heartIcon.style.display = 'none';
                        };                    
                        })
                    };
                } else {
                    console.log('item has no config');
                    console.log(item);
                }
            };
            this.actionTargetPos = item.getPosition();
            this.enableActionBtns();
        } else {
            this.hud.unSelectItem();
            this.disableActionBtns();
            this.hideStatusBar(['heart','diamond-count','confirm']);
        }


    }

    targetGhost = () =>{
        let that = this;
        clearTimeout(that.ghostTimer);

        that.ghostSounds.impact.stop()
        that.ghostSounds.atmo.stop();
        that.ghostSounds.woo.stop();
        that.ghostSounds.creak.stop();
      
        that.ghost.tl.pause();

        that.ghost.place(this.actionTargetPos).then((mesh,pos)=>{
            mesh.lookAt(this.camera.position);
            console.log('play hit');
            that.ghostSounds.hit.play();        

        })
     

        this.actionTargetMesh = that.ghost.mesh;  
    }

    disableActionBtns = () =>{
        let diamond = document.querySelector('#give-diamond');
        diamond.classList.add("disabled");

        let heart = document.querySelector('#give-heart');
        heart.classList.add("disabled");

        let detail = document.querySelector('#view-detail');
        detail.classList.add("disabled");        
    }

    enableActionBtns = () =>{
        let diamond = document.querySelector('#give-diamond');
        diamond.classList.remove("disabled");

        let heart = document.querySelector('#give-heart');
        heart.classList.remove("disabled");

        let detail = document.querySelector('#view-detail');
        detail.classList.remove("disabled");

    }

    throwDiamond = ()=>{
        let that = this;
        if(!that.actionTargetPos){
            return false;
        };
        let throwTime = performance.now();
        let item = this.uiAssets['diamond'];
        if(item){
            this.increaseDiamond();
            let heartStatus = this.hud.getHeartStatus();
            if((this.hud.getDiamondsToSendCount()===0)&&(!heartStatus)){
                setTimeout(()=>{
                    this.hideStatusBar(['heart','diamond-count','confirm'])
                }, 3000)
            } else {

                this.showStatusBar(['diamond-count','select-preview','confirm-not','confirm']);
            };

            let start = this.player.position.clone();
            start.y--;

            let finish = that.actionTargetPos.clone();

            item.place(start).then((mesh)=>{
                mesh.visible = true;                
                anime({
                    begin: function(anim) {
                        item.audioGive.play();
                    },
                    targets: mesh.position,
                    x: finish.x,
                    y: finish.y,
                    z: finish.z,
                    loop: false,
                    duration: 4000,
                    complete: function(anim) {
                        mesh.visible = false;
                    }                   
                });
  
            })
        }   
    }


    increaseDiamond =()=>{
        let diamondCount = this.hud.getDiamondsToSendCount();
        if(diamondCount<5){
            ++diamondCount;
        } else {
            diamondCount = 0;
        };
        let diamondCountEl = document.querySelector('#d-count');
        diamondCountEl.innerHTML = String(diamondCount);
    }

    showStatusBar= (iconList) =>{
        let statusbar = document.querySelector('.statusbar');
        statusbar.style.display = 'inline-block';

        if(iconList){
            iconList.forEach((elId)=>{
                let selector ='#'+elId;
                let el = document.querySelector(selector);
                if(el){
                    el.style.display = 'inline-block';
                } else {
                    console.log('not found: ',selector);
                }                
            })
        }
    }

    hideStatusBar= (iconList) =>{
        let statusbar = document.querySelector('.statusbar');
        statusbar.style.display = 'none';

        if(iconList){
            iconList.forEach((elId)=>{
                let selector ='#'+elId;
                let el = document.querySelector(selector);
                if(el){
                   el.style.display = 'none';
                } else {
                    console.log('not found: ',selector);
                }
            })
        }
    }

    throwHeart = ()=>{
        let that = this;
        let start, finish, sound;        
        let heartStatus = null;
        if(!that.actionTargetPos){
            return false;
        };
        let throwTime = performance.now();
        let item = this.uiAssets['heart'];
        if(item){

            if(this.actionTargetItem){
                if(this.actionTargetItem.config.nft){
                    let heartStatus = this.toggleHeart();
                    console.log(' new heartStatus:' ,heartStatus);
                    if(heartStatus){
                        start = this.player.position.clone();
                        start.y--;

                        finish = that.actionTargetPos;
                        item.audioGive.play();
                        this.config.chainAPI.sendLike(this.hud.selectedItem.config.nft.postHashHex);
                        this.showStatusBar(['heart','diamond-count','select-preview','confirm-not','confirm']);
                    } else {
                        finish = this.player.position.clone();
                        finish.y--;

                        start = that.actionTargetPos.clone();        
                        sound = item.audioTake;
                        item.audioTake.play();              

                        let diamondCount = this.hud.getDiamondsToSendCount();
                        if(diamondCount==0){
                            this.hideStatusBar(['heart','diamond-count','select-preview','confirm-not','confirm']);
                        }
                    }
                } else {
                    console.log('target probably ghost');
                    start = this.player.position.clone();
                    start.y--;

                    finish = that.actionTargetPos;
                    item.audioGive.play();
                }
            } else {
                console.log('no actionTargetItem - cant check heart status');
            }
            
            if(!start){
                return false;
            };

            item.place(start).then((mesh)=>{
                mesh.lookAt(finish);
                mesh.visible = true;

                anime({
                    targets: mesh.position,
                    x: finish.x,
                    y: finish.y,
                    z: finish.z,
                    loop: false,
                    duration: 2000,
                    easing: 'linear',                    
                    complete: function(anim) {
                        if(that.actionTargetItem){
                            if(that.actionTargetItem.isGhost){
                                that.catchGhost();
                            };
                        };
                        mesh.visible = false;
                    }
                });
            })
        }   
    }

    catchGhost = ()=>{
        if(!this.ghostCaught){
            this.ghostSounds.hit.play();
            this.config.chainAPI.catchGhost();
            this.ghostCaught = true;
            this.animateCatchGhost();
        }
    }

    animateCatchGhost = () =>{
        let that = this;
      

            this.ghostHover.pause();  
            this.ghost.mesh.position.y=-1;
            that.ghost.place(this.ghost.mesh.position).then((mesh,pos)=>{
                mesh.lookAt(this.camera.position);     
                setTimeout(()=>{                
                    let ghostSpot = this.ghost.mesh.position.clone()
                    ghostSpot.y = 10;
                    that.addSpotlight(ghostSpot);
                    that.lights.aLight.intensity = 0;                
                    that.ghostup = anime({
                            begin: ()=>{
                                that.ghostSounds.caught.play();            
                            },
                            targets: that.ghost.mesh.position,
                            y: 12.5,
                            loop: false,
                            duration: 25000,
                            easing: 'linear',
                            complete: ()=>{
                                that.lights.switchOnDirectional();                                             
                                that.ghost.mesh.visible = false;
                                that.lights.aLight.color.setHex(0xffffff);
                                that.lights.aLight.intensity = 1;    
                                that.scene.remove(that.spotLight);
                                that.scene.remove(that.spotLight2);       
                            }
                        });        
                    },3000)                
            })

       

        
    }

    toggleHeart = () =>{
        let heartStatus = this.hud.getHeartStatus();
        let heartIcon = document.getElementById('heart');
        if(heartStatus){
            heartIcon.style.display = 'none';
            return false;
        } else {
            heartIcon.style.display = 'inline-block';
            return true;
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

    formatDate =(date)=> {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(date).toLocaleTimeString('en', options);
    }

    convertNanosToDeso = (nanos, d) =>{
        return (nanos / 1e9).toFixed(d)        
    }

    checkMouseDbl = (e) =>{
        
        let action = this.raycast(e);
       // this.updateOverlayPos(action.selectedPoint);
        switch(parseInt(action.btnIndex)){
            case 1:
             this.showSelectedMeshData(action);
            break;
            default:
                this.showSelectedMeshData(action);
            break;
        }
    }

    displayInHUD = (data) =>{
        let msg = '<div class="flex-left">';
                msg = msg+ '<h4>Minted By '+data.creator+'</h4><p>'+data.description+'</p></div>';

                msg = msg+ '<div class="flex-right">';

                msg = msg+ '<dl><dt>Minted</dt>';
                msg = msg+ '<dd>'+data.created+'</dd>';

                msg = msg+ '<dt>Copies</dt>';
                msg = msg+ '<dd>'+data.copies+'</dd>';            

                msg = msg+ '<dt>Copies For Sale</dt>';
                msg = msg+ '<dd>'+data.copiesForSale+'</dd>';                       
                if(data.isBuyNow){
                    msg = msg+ '<dt>Buy Now Price</dt>';
                    msg = msg+ '<dd></dd>';                
                };
                msg = msg+ '<dt>Highest Sale Price</dt>';
                msg = msg+ '<dd>'+data.maxPrice+' DeSo</dd>';

                msg = msg+ '<dt>Last Bid Price</dt>';
                msg = msg+ '<dd>'+data.lastBidPrice+' DeSo</dd>';                
/*
                msg = msg+ '<dt>Auction End Time:</dt>';
                msg = msg+ '<dd>'+data.endTime+'</dd>';                
*/
                msg = msg+ '</dl>'
                msg = msg+ '</div>'                
        if(this.hud){
           this.hud.show(msg);
        }
    }

    updateOverlayPos = (pos) =>{
        let posText = 'x: '+pos.x+' y: '+pos.y+' z: '+pos.z;
        document.querySelector('span#pos-display').innerHTML = posText;
     /*   console.log('camera status');
        console.log(this.camera);
        console.log('controls status');
        console.log(this.controls)        */
    }
    raycastAhead = ( ) => {

        let origin = this.camera.position;

        let dest = origin.clone();
            dest.setZ(1000); //raycast forward
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        this.raycaster.set(origin,dir);
        var intersects = this.raycaster.intersectObjects( this.scene.children, true );
        let hit;
        if(intersects[0]){   
            hit = intersects[0];
            return hit;
        } else {
            return false;
        };

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
            origin.setY(origin.y+2);

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

    /* Close fullscreen */
    closeFullscreen = () =>{
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
      }
      this.isFullScreen = false;            

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
        this.resizeCanvas();
    
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
        this.renderer.setAnimationLoop(this.render);
    }
    
    render = () =>{
         if (this.renderer.xr.isPresenting === true) {
            if(this.vrControls){
                this.vrControls.checkControllers();
            }
        }  

        const delta = Math.min( this.clock.getDelta(), 0.1 );


            if ( params.firstPerson ) {

            this.controls.maxPolarAngle = Infinity;
            this.controls.minDistance = 1e-4;
            this.controls.maxDistance = 1e-4;

            } else {
/*
                this.controls.maxPolarAngle = Math.PI / 2;
                this.controls.minDistance = 1;
                this.controls.maxDistance = 20;
*/
            }

              if ( this.collider ) {
//console.log('got this.collider');
                this.collider.visible = params.debug;
                if(this.sceneryLoader.visualizer){
                   this.sceneryLoader.visualizer.visible = params.debug;
                }

                const physicsSteps = params.physicsSteps;

                for ( let i = 0; i < physicsSteps; i ++ ) {

                    if (this.renderer.xr.isPresenting === true) {
                        if(this.vrType==="walking"){
                           this.updatePlayerVR( delta );
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

        //this.controls.update();
    //    this.updateAnimations(delta);
        this.renderer.render(this.scene, this.camera);
        //this.hud.render();

    }

    updateAnimations = (delta)=>{
        this.sceneInventory.updateAnimations(delta);
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
      var elem = this.el;
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
            let item = that.initItemForModel({modelUrl:modelUrl});
            that.mesh = item.mesh;
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
           
            let item = that.initItemForModel({modelUrl:modelUrl});
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

    initGhost = () =>{
        if(this.renderer.xr.isPresenting){
            return false;
        };
        let that = this;
        this.lights.switchOffDirectional();

        this.ghostSounds = [];

        let itemConfig = {  scene: this.scene,
                            format: 'glb',
                            height:2.5,
                            width:2.5,
                            depth:2.5,
                            modelUrl:'/models/ghostHQ.fbx'};

        this.ghost = this.initItemForModel(itemConfig);
        this.ghost.isGhost = true;


        let playerFloor = this.sceneryLoader.findFloorAt(new THREE.Vector3(12,0,12), 2, -1);

        let placePos = new THREE.Vector3(12,(playerFloor.y),12);
        this.ghost.place(placePos).then((mesh, pos)=>{

            that.ghostSounds.creak = new AudioClip({
                                    path: '/audio/dark-choir-singing-16805.mp3',
                                    mesh: mesh,
                                    listener: that.audioListener
                                });

            that.ghostSounds.atmo = new AudioClip({
                                        path: '/audio/old-ghost-abandoned-house-atmo-7020.mp3',
                                        mesh: mesh,
                                        listener: that.audioListener
                                    });

            that.ghostSounds.woo = new AudioClip({
                                        path: '/audio/classic-ghost-sound-95773.mp3',
                                        mesh: mesh,
                                        listener: that.audioListener
                                    });        

            that.ghostSounds.impact = new AudioClip({
                                path: '/audio/halloween-impact-05-93808.mp3',
                                mesh: mesh,
                                listener: that.audioListener
                            });       

            that.ghostSounds.hit = new AudioClip({
                                path: '/audio/ahhhh-37191.mp3',
                                mesh: mesh,
                                listener: that.audioListener
                            });       

            that.ghostSounds.caught = new AudioClip({
                                path: '/audio/angelic-voice-81921.mp3',
                                mesh: mesh,
                                listener: that.audioListener
                            });      
            that.lights.aLight.intensity = 0.5;     
            that.animateGhost();
            that.startHover();
       
        })


    }


    animateGhost = ()=>{

        let that = this;

            let tl = anime.timeline({
              easing: 'linear',
              duration: 20000,
              loop: false,
              complete: ()=>{
                that.ghostTimer = setTimeout(()=>{
                    that.animateGhost();
                },1000)
              }
            });


            tl.add({
                    targets: that.ghost.mesh.position,
                    x: -12,
                    z: 12,                    

                    loop: false,
                    easing: 'linear',
                    duration: 5000,
                    begin: ()=>{
                        that.ghostSounds.atmo.play();

                        that.ghost.mesh.position.set(12,0,12);
                        this.ghost.mesh.lookAt(-12,0,12);

                        that.lights.aLight.color.setHex(0x00ff00);
                    },
                });

            tl.add({
                    targets: that.ghost.mesh.position,
                    x: -12,
                    z: -12,

                    loop: false,
                    easing: 'linear',
                    duration: 5000,
                    begin: ()=>{
                        that.ghostSounds.woo.play()

                        this.ghost.mesh.position.set(-12,0,12);       
                        this.ghost.mesh.lookAt(-12,0,-12);

                        that.lights.aLight.color.setHex(0xff0000);                        
                    }
                });

            tl.add({
                    targets: that.ghost.mesh.position,
                    x: 12,
                    z: -12,

                    loop: false,
                    easing: 'linear',
                    duration: 5000,
                    begin: ()=>{

                        that.ghostSounds.creak.play()

                        this.ghost.mesh.position.set(-12,0,-12);       
                        this.ghost.mesh.lookAt(12,0,-12);

                        that.lights.aLight.color.setHex(0x00ff00);

                    }
            });

            tl.add({
                    targets: that.ghost.mesh.position,
                    x: 12,
                    z: 12,                    

                    loop: false,
                    easing: 'linear',
                    duration: 5000,
                    begin: ()=>{
                        that.ghostSounds.impact.play()
                        this.ghost.mesh.position.set(12,0,-12);       
                        this.ghost.mesh.lookAt(12,0,12);
            
                        that.lights.aLight.color.setHex(0xff0000);

                    }
            });   
            
        that.ghost.tl = tl;
    }

    startHover = () =>{
        this.ghostHover = anime({
                    begin: function(anim) {
                      
                    },
                    targets: this.ghost.mesh.position,
                    y: 2,
                    loop: true,
                    duration: 2500,
                    easing: 'linear',
                    direction: 'alternate'
                });
    }
    calcDirection = (x,y,z) =>{
        this.dirCalc.set(x,y,x);
        this.newDir.addVectors(this.dirCalc, this.ghost.mesh.position);
        this.ghost.mesh.lookAt(this.newDir);
    }

    addSpotlight = (pos) =>{
    let spotLight = new THREE.SpotLight( 0xffffff, 10 );
        spotLight.position.copy(pos);
        spotLight.position.y = 10;
        spotLight.angle = Math.PI / 18;
        spotLight.penumbra = 1;
        spotLight.decay = 2;
        spotLight.distance = 100;
        spotLight.target = this.ghost.mesh;

      
        this.scene.add( spotLight );        
        this.spotLight = spotLight;

        let pos2 = pos.clone();

    let spotLight2 = new THREE.SpotLight( 0xffffff, 10 );
        spotLight2.position.copy(pos2);
        spotLight2.position.y = -2;
        spotLight2.angle = Math.PI / 12;
        spotLight2.penumbra = 1;
        spotLight2.decay = 2;
        spotLight2.distance = 100;
        spotLight2.target = this.ghost.mesh;

      
        this.scene.add( spotLight );      
        this.scene.add( spotLight2 );   
        this.spotLight = spotLight;        
        this.spotLight2 = spotLight2;      
   // let lightHelper = new THREE.SpotLightHelper( spotLight );
  //  this.scene.add( lightHelper );
    }

    initInventory = (options) =>{
        let items =[];
        if(options.items){
            items = options.items;
        };
     
    /*    this.inventory = new D3DInventory({ chainAPI: this.config.chainAPI,
                                            imageProxyUrl: this.config.imageProxyUrl,    
                                            items: items,
                                            scene: this.scene,
                                            loader: this.loader,
                                            loaders: this.loaders,
                                            width: this.config.sceneryOptions.scaleModelToWidth,
                                            depth: this.config.sceneryOptions.scaleModelToDepth,
                                            height: this.config.sceneryOptions.scaleModelToHeight,
                                            modelsRoute: this.config.modelsRoute,
                                            nftsRoute: this.config.nftsRoute,
                                            loadingScreen: this.loadingScreen
                                        });*/
        this.sceneInventory = null;
        if(options.sceneAssets){
            this.layoutPlotter = new LayoutPlotter({
                                                 camera: this.camera,
                                                 scene: this.scene,
                                                 sceneryLoader: this.sceneryLoader});  
            
            let maxItems =this.layoutPlotter.getMaxItemCount();
            let items2d = options.sceneAssets.filter(nft => ((!nft.is3D)&&(nft.imageURLs[0])));     

            let maxItems3D =this.layoutPlotter.getMaxItemCount3D();

            let items3d = options.sceneAssets.filter(nft => nft.is3D);
            let spookyNFTs = options.sceneAssets.filter(nft => (nft.postHashHex == '53f8b46d41415f192f9256a34f40f333f9bede5e24b03e73ae0e737bd6c53d49'||nft.postHashHex=='8e0bbd53cd4932294649c109957167e385367836f0ec39cc4cc3d04691fffca7'));
            this.ghosts = spookyNFTs.filter(nft => (nft.postHashHex == '53f8b46d41415f192f9256a34f40f333f9bede5e24b03e73ae0e737bd6c53d49'));

            items3d = items3d.concat(spookyNFTs)
            let items3dToRender = items3d.slice(0,maxItems3D);   

            if(items2d.length===0){
                items2d = items3d.slice(maxItems3D);
                //display 2d images of 3d items if there are no more 2d images
            };


            this.loadingScreen.startLoading({items:items2d,
                                        name:'NFTs'});

            let sceneInvConfig = {          
                                animations: this.config.animations,
                                chainAPI: this.config.chainAPI,
                                imageProxyUrl: this.config.imageProxyUrl,    
                                items2d: items2d,
                                items3d: items3dToRender,
                                scene: this.scene,
                                loader: this.loader,
                                loaders: this.loaders,
                                width: 3,
                                depth: 3,
                                height: 3,
                                modelsRoute: this.config.modelsRoute,
                                nftsRoute: this.config.nftsRoute,
                                layoutPlotter: this.layoutPlotter,
                                loadingScreen: this.loadingScreen
                                }

            let haveVRM = this.haveVRM(items3dToRender);
            if(haveVRM){
               
                sceneInvConfig.animLoader = true;

            }
            this.sceneInventory = new D3DInventory(sceneInvConfig);     
        }
        
    }

    haveVRM = (items3dToRender) =>{
        console.log(items3dToRender);
        //items3dToRender.filter(item=>(item.nft.))
        return true; //test
    }
    
    initItem = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';
        let itemParams = {
            three: THREE,
            scene: this.scene,
            height: opts.height,
            width: opts.width,
            depth: opts.depth,
            loader: this.loaders.getLoaderForFormat(opts.format),
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,


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

    initItemForModel = (opts) =>{
        let item = null;

        let urlParts = opts.modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];
        let config = {
            three: THREE,
            loader: this.loaders.getLoaderForFormat(extension),
            scene: this.scene,
            height: (opts.height)?opts.height:this.config.scaleModelToHeight,
            width: (opts.width)?opts.width:this.config.scaleModelToWidth,
            depth: (opts.depth)?opts.depth:this.config.scaleModelToDepth,
            modelUrl: opts.modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:extension
        }

        console.log('init item for model format: ',extension.toLowerCase());
        if(extension.trim().toLowerCase()==='vrm'){
            config.animations = this.config.animations;
            item = new ItemVRM(config);
            console.log('return vrm item');
        } else {
            item = new Item(config);
        };

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

                                let vrType = 'walking';

                                that.initVRSession(vrType);                                
                            } }
        let vrButtonEl = VRButton.createButton(this.renderer, vrBtnOptions);
    }

    stopAllAnimations = () =>{
        if(this.ghostTimer){
            clearTimeout(this.ghostTimer);

            this.ghostSounds.impact.stop()
            this.ghostSounds.atmo.stop();
            this.ghostSounds.woo.stop();
            this.ghostSounds.creak.stop();
            if(this.ghost){
               this.ghost.tl.pause();
            }

            this.lights.switchOnDirectional();                                             
            if(this.ghost.mesh){
                this.scene.remove(this.ghost.mesh);
            };

            this.lights.aLight.color.setHex(0xffffff);
            this.lights.aLight.intensity = 1; 
            if(this.spotLight) {
                this.scene.remove(this.spotLight);
                this.scene.remove(this.spotLight2);         
            }
        }
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
        this.vrType = vrType;
    }

    initVRSession = (vrType) =>{
        let that = this;

        this.controlProxy = {};
        this.vrControls = new VRControls({  renderer: this.renderer,
                                            scene:this.scene,
                                            vrType: 'walking',
                                            moveUp: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'u';                                                
                                            },
                                            moveDown:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'd';
                                            },
                                            moveLeft:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'l';  
                                            },                                            
                                            moveRight:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'r';
                                            },
                                            moveForward:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'f';                                                   
                                            },
                                            moveBack:(data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'b';
                                            },
                                            rotateLeft: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.rot = 'rl';
                                                console.log('rotate left spaceViewer');

                                            },
                                            rotateRight: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.rot = 'rr';

                                                console.log('rotate right spaceViewer');

                                            },
                                            onSelectStartLeft: ()=>{
                                                console.log('onSelectStart paddle down');
                                            //    that.controlProxy.rot = 'rl';                                                
                                            },
                                            onSelectEndLeft: ()=>{
                                             console.log('onSelectEnd paddle up')   
                                            },
                                            onSelectStartRight: ()=>{
                                                console.log('onSelectStart paddle down')   
;
                                            //    that.controlProxy.rot = 'rl';                                                
                                            },
                                            onSelectEndRight: ()=>{
                                             console.log('onSelectEnd paddle up')   
                                            },
                                            stopMoving: ()=>{
                                                that.controlProxy.data = null;
                                                that.controlProxy.value = null;
                                                that.controlProxy.dir =null;  
                                            },
                                            cancelRotate: ()=>{
                                                that.controlProxy.isRotating = false;
                                                that.controlProxy.rot = null;
                                            }
                                        });

        this.playerVR = new PlayerVR({  controllers: this.vrControls.controllers,
                                        grips: this.vrControls.grips,
                                        camera: this.camera,
                                        controlProxy: this.controlProxy,
                                        playerStartPos: this.player.position.clone(),
                                        sceneCollider: this.sceneryLoader.collider});

        this.scene.add(this.playerVR.dolly);




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

    addClickListenerViewDetails = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            let item = that.hud.getSelectedItem();
            if(item){
                let nftDisplayData = item.nftDisplayData;
                if(item.config.spot){
                    nftDisplayData.spot = item.config.spot;
                };
                this.displayInHUD(nftDisplayData);                
            }         
        });     
    } 

    addClickListenerGiveDiamond = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };
            that.throwDiamond();
        });     
    }    

    addClickListenerGiveHeart = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };            
            that.throwHeart();
        });     
    }    

    addClickListenerBuyNow = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };
            this.hud.openBuyNFT()    
        });     
    } 


    addClickListenerViewPage = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('disabled')){
                return false;
            };
            this.hud.openNFTPage()           
        });     
    } 

    addClickListenerFullScreen = (el) => {
        let that = this;

        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            if(that.isFullScreen){
                that.closeFullscreen();
                that.toggleFullScreenBtnText(e.target,'Full')                
            } else {
                that.openFullscreen();
                that.toggleFullScreenBtnText(e.target, 'Exit');
            }
            that.resizeCanvas(true);
        });     
    }    

    toggleFullScreenBtnText = (link, msg) =>{
        link.innerHTML = msg;
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
        new THREE.MeshStandardMaterial({ transparent: (!params.debug), opacity: 0})
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
    let item = that.initItemForModel({modelUrl:'./characters/AstridCentered.glb'});
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
    let playery = this.player.position.y;
    let playerz = this.player.position.z;
    //this.camPos.set(playerx,(playery),playerz);
    this.controls.target.set(playerx,(playery),playerz);
    this.camera.position.add( this.controls.target );
  
    // if the player has fallen too far below the level reset their position to the start
    if ( this.player.position.y < - 25 ) {

        this.reset();

    }

}

    updatePlayerVR = (delta) =>{
        if(!this.playerVR){
            return false;
        };

        this.playerVR.moveDolly(delta);
    }

 updatePlayerVROld = (delta) =>{
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
         
                    this.dolly.position.set(playerx,(playery),playerz);
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
        this.player.position.set(this.config.playerStartPos);
       // this.camera.position.set( this.player.position );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );
   //     this.controls.update();

    }    

    stopAnimationLoop = () =>{
        this.renderer.setAnimationLoop(null);
        console.log('render loop stopped');
    }
};

export {D3DSpaceViewer}