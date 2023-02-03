// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Loaders, PlayerVR, AudioClipRemote, Physics, AudioClip, Item, ItemVRM, LoadingScreen, HUDBrowser, HUDVR, SceneryLoader, Lighting, LayoutPlotter, D3DInventory, NFTViewerOverlay, VRButton, VRControls } from 'd3d';
let clock, gui, stats, delta;
let environment, visualizer, player, controls, geometries;
let playerIsOnGround = false;
let KeyBPressed, spacePressed = false, fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false, rotlftPressed = false, rotRgtPressed = false;
let nextPos = new THREE.Vector3();



const params = {
    debug: false,
    firstPerson: false,
    visualizeDepth: 10,
    gravity: - 30,
    playerSpeed: 3,
    physicsSteps: 16};

 export default class SpaceViewer {
    
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
                    lookAtStartPos: {x:0,y:2,z:0},
                    dLights: [  {name:'above',intensity:1},
                                {name:'below',intensity:0.5},
                                {name:'left',intensity:0},
                                {name:'right',intensity:0},
                                {name:'front',intensity:0},
                                {name:'back',intensity:0}]
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
        this.loaders = new Loaders({defaultLoader:this.defaultLoader});
        this.initLoaders();
        this.clock = new THREE.Clock();
        environment = null;
        this.collider = null;
        this.moveTo = false;
        this.mouseCoords = new THREE.Vector2();
        this.vrType = this.config.vrType;
        this.camPos = new THREE.Vector3();
        this.objectsInMotion = []; // use for things being thrown etc
       // this.initLoader(this.config.owner);
        this.dirCalc = new THREE.Vector3(1, 1, 1);
        this.newDir = new THREE.Vector3(1, 1, 1);
        this.ghostCaught = false;
        this.actionTargetItem = null;
        this.actionTargetMesh = null;
        this.animations = [];
        this.audioListener = new THREE.AudioListener();
        this.controlProxy = {};
        this.ballVector = new THREE.Vector3();
        this.kickVector = new THREE.Vector3();
        this.claimed = false;
        this.currentAudio = null;
        this.audioTracks = [];
        this.workingMatrix = new THREE.Matrix4();
        this.d = new Date();
        this.nftClaimed = false;
        this.avatars = [];

    }

    initPhysicsWorld = () =>{
        this.dt = 1.0/90.0;
        this.damping = 0.01;
        const world = new CANNON.World();
              world.gravity.set(0,-20,0);
              world.broadphase = new CANNON.NaiveBroadphase();

        this.world = world; 

        this.bodies = [];      
        this.physics = new Physics({ world: world,
                                    bodies: this.bodies,
                                    scene: this.scene});


      //  this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, world)
    }

    createLabel = (text, group, pos) =>{
        // Create a canvas element to render the text label
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');

        // Set the font and text for the label
        ctx.font = '40px Arial bold';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width);

        // Create a texture from the canvas
        var texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        // Create a sprite material using the texture
        var material = new THREE.SpriteMaterial({ map: texture });

        // Create a sprite and position it above the 3D object
        var label = new THREE.Sprite(material);
        label.position.set(pos.x, pos.y, pos.z);

        // Add the sprite to the scene
        group.add(label);

        // Make the sprite always face the camera
        label.lookAt(this.camera.position);        
    }

    setMasterVolume = (num) =>{
        this.audioListener.setMasterVolume(num);
    }

    initSpace = (options) =>{
        let that = this;
        let sceneryloadingComplete = false
        let nftLoadingComplete = false;

        return new Promise((resolve, reject) => {
            this.mouse = new THREE.Vector2(0,0,0);
            this.getContainer(this.config.el);

            this.initScene();
            this.initRenderer(this.config.el);
            /*this.initHUD({scene:that.scene,
                            chainAPI: that.config.chainAPI});*/
            this.initSkybox();
            this.initLighting();


            this.loadScenery().then(()=>{
        
                this.initPhysicsWorld();        

                this.initInventory(options);        
               // this.initTestAnimation();
                this.initCameraPlayer();     

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

                that.resizeCanvas();

                that.addListeners();
                console.log('addListeners')
                that.audioListener.setMasterVolume(1);
                this.camera.setRotationFromEuler(new THREE.Euler( 0,Math.PI,0, 'XYZ' ));
                that.animate();
                sceneryloadingComplete = true;               
            });

  

        });
    }

    initTestAnimation = () =>{
        let that = this;
        let itemConfig = { animLoader: true,
                            scene: this.scene,
                            height:2.5,
                            width:2.5,
                            depth:2.5,
                            modelUrl: this.config.avatarPath};

        this.testAvatar = this.initItemForModel(itemConfig);
        console.log('initTestAnimation');
        console.log(itemConfig);
        that.avatars.push(this.testAvatar);

        let playerFloor = this.sceneryLoader.findFloorAt(new THREE.Vector3(3,1,2), 1, -2);

        let placePos = new THREE.Vector3(0,playerFloor,0);
        this.testAvatar.place(placePos, this.scene).then((mesh, pos)=>{
          //  that.testAvatar.currentAnim.action.play();
            //console.log('play started and mesh added');

        })
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
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100 );
        this.camera.updateProjectionMatrix(); 
        //this.camera.add( this.audioListener );
        this.camera.rotation.set(0,0,0);
        let camStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z-3);
        this.camera.position.copy(camStartPos);

        this.raycaster = new THREE.Raycaster({camera:this.camera});
        this.pRaycaster = new THREE.Raycaster();

    }

    initCamera = () =>{
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/600, 0.01, 100 );
      //  this.camera.add( this.audioListener );
        //this.camera.rotation.set(0,0,0);
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
        let dLights = this.config.dLights;



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
      //  this.addEventListenerMouseClick();
       // this.addEventListenersHUD()
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
                   // case 'KeyM': that.throwActiveItem(); break;
                    case 'NumpadAdd': that.setMasterVolume(1); break;
                    case 'NumpadSubtract': that.setMasterVolume(0); break;   
                    case 'Numpad0': 
                    break;
                    case 'Numpad4': 
                        //that.moveMeshLeft();
                    break;  
                    case 'Numpad6': 
                        //that.moveMeshRight();
                    break;    
                    case 'Numpad8': 
                        //that.moveMeshForward();
                    break;    
                    case 'Numpad2': 
                        //that.moveMeshBack();
                    break;
                    case 'NumpadAdd': 
                        //that.moveMeshBack();
                    break;                        
                    case 'NumpadSubtract': 
                        //that.moveMeshBack();
                    break;                     
                    case 'Enter':
                        that.throwSnowBall(e, null);
                    break;
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
                            if(that.player.avatar){
                                that.player.avatar.animLoader.switchAnim('jump');
                                that.player.state = 'jump';
                                spacePressed = true;                                

                                that.playerVelocity.y = 6.0;


                            };


                        }

                        break;
                    case 'KeyB':
                        if ( that.playerIsOnGround ) {
                            if(that.player.avatar){
                                let newState = 'dance'
                                if(that.player.state == 'dance'){
                                    newState = 'dance2';
                                } else if(that.player.state == 'dance2'){
                                    newState = 'dance3';
                                } else if(that.player.state == 'dance3'){
                                    newState = 'dance';
                                };
                                that.player.avatar.animLoader.switchAnim(newState);
                                that.player.state = newState;
                                KeyBPressed = true;
                            };


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
                    case 'Space': spacePressed = false; break;
                    case 'KeyBPressed': KeyBPressed = false; break;
                }

            } );

    }
    moveMeshLeft = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateX(0.1)
        }
    }

    moveMeshRight = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateX(-0.1)          
        }       
    }

    moveMeshForward = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateZ(-0.1)           
        }
    }

    moveMeshBack = () =>{
        if(this.hud.selectedItem){
            this.hud.selectedItem.translateZ(0.1)         
        }        
    }

    resetBall = () =>{
        if(this.ball){
            this.ball.velocity.set(0,0,0);
            this.ball.angularVelocity.set(0,0,0);
            this.ball.position.copy(this.ballVector);
        }
    }
    addEventListenerMouseClick = ()=>{
        let that = this;
        this.renderer.domElement.addEventListener( 'mouseup', this.checkMouseUp, false );
        this.renderer.domElement.addEventListener( 'mousedown', this.checkMouseDown, false );        
        this.renderer.domElement.addEventListener( 'dblclick', this.checkMouseDbl, false );
        this.renderer.domElement.addEventListener("touchstart", ()=>{
        if(!this.holding){
            const d = new Date();
            that.startTime = d.getTime();
            that.holding = true;
        }}, false);

        this.renderer.domElement.addEventListener("touchend", ()=>{
            fwdPressed = false;
            that.holding = false;
            that.startTime = false;
        }, false);
    }

checkMouseDown = (e) =>{
        let that = this;
        let action = this.raycast(e);
        if(!action.selectedPoint){          
            return false;
        };
       // console.log('action.btnIndex: ',action.btnIndex);
        switch(parseInt(action.btnIndex)){
            case 1:

            break;
        }
    }


    checkMouseUp = (e) =>{
        let that = this;
        let action = this.raycast(e);
        if(!action.selectedPoint){
            return false;
        };
       // console.log('action.btnIndex: ',action.btnIndex);
        switch(parseInt(action.btnIndex)){
            case 1:
                fwdPressed = false;
                this.holding = false;
                this.startTime = false;
                this.selectTargetNFT(action);
            
    
            break;            
            case 2:
                this.showSelectedMeshData(action);
            break;
            default:
                this.showSelectedMeshData(action)
            break;
        }
    }

    myInterval = ()=> {
        let that = this;
      var setIntervalId = setInterval(function() {
        if (!that.holding) clearInterval(setIntervalId);
      }, 1000); //set your wait time between consoles in milliseconds here
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
           // console.log('no owner: ', action.selection.object);
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
        let tracks = [];

        this.actionTargetMesh = null;
        let that = this;

        let item = this.getItemForAction(action)

        if(item){
            if(item.isGhost||item.isFootballPlayer||item.isFootball){
                this.actionTargetPos = item.getPosition();       
                this.actionTargetItem = item;
                if(item.isGhost){
                    this.targetGhost();
                };
                if(item.isFootballPlayer){
                    this.targetFootballPlayer(item);
                };
                if(item.isFootball){
                    this.targetFootball();
                };
            } else {
                if(item.config.nft){
                    if(item.config.nft.isAudio){
              
                        this.config.chainAPI.fetchPostDetail({postHashHex:item.config.nft.postHashHex}).then((res)=>{
                            res.json().then((json)=>{
                                if(json.audioData){
                                    tracks = this.parseAudioData(json.audioData);
                                    let firstTrack = this.getTrackFullUrl(item.config.nft.postHashHex, tracks[0]);
                                    if(that.currentAudioHash === item.config.nft.postHashHex){
                                        that.currentAudio.pause();
                                        that.currentAudioHash = null;
                                    } else {
                                        that.playAudioNFTTrack(item.config.nft.postHashHex, firstTrack);
                                    }
                                }
                            })
                           
                        }).catch((err)=>{
                            console.log('errpr getting audio data');
                        });

                    }

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
                            //that.hud.setSelectedItem(item);

                }
            };
            this.actionTargetPos = item.getPosition();
            this.enableActionBtns();
        } else {
            if(this.config.isCurated){
                let e= action.e;
                if(this.sounds.throwSound){
                   this.sounds.throwSound.play();
                } else {
                    console.log('no throwSound');
                }
                let x = ( e.clientX / window.innerWidth ) * 2 - 1;
                let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
                this.mouse.set(x,y);
                this.throwSnowBall(action.e, null);                    
            }              
            this.hud.unSelectItem();
            this.disableActionBtns();
            this.hideStatusBar(['heart','diamond-count','confirm']);

        }


    }

    parseAudioData = (audioData)=>{
        let tracks = [];
        let info = {};
        console.log('audio detected!');
        let audioExtraData = audioData;
           if(audioExtraData){
            audioData = JSON.parse(audioExtraData)
            console.log('audioData',audioData)
            if(audioData && audioData.TrackCount > 0){
                tracks = JSON.parse(audioData.Tracks)
                //if (previewMode){
                    tracks = tracks.map(x=> { x.trackFile = x.trackFile.replaceAll(' ','%2520');return x });
                //}
            
                console.log('tracks player',tracks);


                console.log('title', audioData.Title)

                info.title = audioData.Title
                info.author = audioData.Author
                info.category = audioData.MusicCategory
                info.subcategory = audioData.MusicSubCategory
                console.log('info',info);
            }
        }
        return tracks;
    }

    getTrackFullUrl = (postHashHex, track) =>{
        let url  = 'https://desodata.azureedge.net/unzipped/'+postHashHex+'/'+track.trackFile;
        return url;
    }

    playAudioNFTTrack = async (postHashHex, fullUrl) =>{
        let that = this;
        console.log('playAudioNFTTrack');
        if(this.currentAudio){
            this.currentAudio.pause();
            this.currentAudio.src = fullUrl
            this.currentAudio.type = 'audio/wav';
        } else {
            this.currentAudio = new Audio();  
            //https://desodata.azureedge.net/unzipped/1588d17557a44cdbdfaf2d8cbb62df4c1336eae46f3e043309d4edecbec6d3a5/Paradigm%2520Shift%2520Master.wav'
            // https://desodata.azureedge.net/unzipped/1588d17557a44cdbdfaf2d8cbb62df4c1336eae46f3e043309d4edecbec6d3a5/Paradigm%20Shift%20Master.wav
            console.log('set src to: ',fullUrl);
            this.currentAudio.src = fullUrl
            this.currentAudio.type = 'audio/wav'
        }


        try {
            await this.currentAudio.play();
            console.log('Playing using set src...',this.currentAudio.src);
            this.isPlayingAudio = true;
            this.currentAudioHash = postHashHex;
        } catch (err) {
            console.log('Failed to play...' + err);
            this.isPlayingAudio = false;            
        }
        


 /*       console.log('create trackClip');
            let trackClip = new AudioClipRemote({
                        path: fullUrl,
                        mesh: this.sceneryMesh,
                        listener: this.audioListener,
                        onEnded: () =>{
                            that.playingTrack = null;
                        }
                    });
            console.log('about to play: ', fullUrl);
            trackClip.play();
            console.log('playing');
            this.audioTracks[postHashHex] = trackClip;
            this.playingTrack = this.audioTracks[postHashHex];*/

    }

    targetFootballPlayer = (item) =>{
        console.log('targeted player');
        console.log(item);
        this.actionTargetItem = item;
        this.actionTargetMesh = item.mesh;        
    }

   
    getShootDirection =() => {
          const vector = new THREE.Vector3(0, 0, 1)
          vector.unproject(this.camera)
          const ray = new THREE.Ray(this.ball.position, vector.sub(this.ball.position).normalize());
          return ray.direction
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

   
    formatDate =(date)=> {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(date).toLocaleTimeString('en', options);
    }

    convertNanosToDeso = (nanos, d) =>{
        return (nanos / 1e9).toFixed(d)        
    }

    checkMouseDbl = (e) =>{

        let action = this.raycast(e);
       // console.log('action.btnIndex: ',action.btnIndex);
        
     //   this.updateOverlayPos(action.selectedPoint);
        switch(parseInt(action.btnIndex)){
            case 1:
                if(this.config.isCurated){
                    if(this.sounds.throwSound){
                       this.sounds.throwSound.play();
                    } else {
                        console.log('no throwSound');
                    }
                    let x = ( e.clientX / window.innerWidth ) * 2 - 1;
                    let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
                    this.mouse.set(x,y);
                    this.throwSnowBall(e, null);                    
                } else {
                    this.showSelectedMeshData(action);
                }
            break;
            default:
                let x = ( e.clientX / window.innerWidth ) * 2 - 1;
                let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
                this.mouse.set(x,y);
                this.throwSnowBall(e, null);
            break;
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
        let x = ( e.clientX / window.innerWidth ) * 2 - 1;
        let y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        this.mouse.set(x,y);

        //2. set the picking ray from the camera position and this.mouse coordinates
        if(!(this.mouse)||!(this.camera)){
            return false;
        };
        try{
            let raycaster = new THREE.Raycaster();            
                raycaster.setFromCamera( this.mouse, this.camera );    
        //3. compute intersections (note the 2nd parameter)
        var intersects = raycaster.intersectObjects( this.scene.children, true );
        let floorLevel;
        if(intersects[0]){
            isOnFloor = this.isOnFloor(raycaster, intersects[0].point);
            isOnWall = this.isOnWall(raycaster, intersects[0].point);
        };
        return {
            e:e,
            isOnFloor: isOnFloor,
            isOnWall: isOnWall,
            btnIndex: btnIndex,
            selectedPoint: (intersects[0])?intersects[0].point:null,
            selection: (intersects[0])?intersects[0]:null,
        }

        } catch (error) {
          console.log(error);
          return false;

        }


       
    }

    isOnFloor = (raycaster, selectedPoint, meshToCheck) =>{

        let origin = selectedPoint.clone();
            origin.setY(origin.y+2);

        let dest = selectedPoint.clone();
            dest.setY(-1000); //raycast downwards from selected point.
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        raycaster.set(origin,dir);
        var intersects = raycaster.intersectObjects( this.scene.children, true );
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

isOnWall = (raycaster, selectedPoint, meshToCheck) =>{
        let origin = selectedPoint.clone();
         //   origin.setZ(origin.z-1);
        let dest = selectedPoint.clone();
            dest.setZ(this.player.position.z); //raycast downwards from selected point.
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        raycaster.set(origin,dir);
        var intersects = raycaster.intersectObjects( this.scene.children, true );
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
        }

    }

    placeActiveItem = (pos) =>{
        let item = this.inventory.getActiveItem();
        if(item){
            item.place(pos);
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

    getRandom = (min, max) => {
        min = min*10;
        max = max*10;
        let randomInt = this.getRandomInt(min, max);
        return randomInt/10;
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
            console.log('resizeCanvas');
        };

        this.controls.update();
    }

        
        
    animate = () =>{
        this.renderer.setAnimationLoop(this.render);
    }
    
    render = () =>{

       // this.cannonDebugRenderer.update()
         if (this.renderer.xr.isPresenting === true) {
            if(this.vrControls){
                this.vrControls.checkControllers();
            }
        } else {
            if(this.holding&&(!fwdPressed)){
                let d = new Date();
                let timeNow = d.getTime();
                let timeDiff = timeNow - this.startTime;
                if(timeDiff>1500){
                    fwdPressed = true;
                }
            }
        }

        const delta = Math.min( this.clock.getDelta(), 0.1 );
        if(this.world){
            this.updatePhysicsWorld();
            if(this.ball){
                if(this.ball.position.y < -2){
                    this.resetBall();
                }
            }
        };

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
        //this.updateAnimations(delta);
        this.updateAvatarAnimations(delta);
        this.renderer.render(this.scene, this.camera);
        //this.hud.render();

    }

    updateAnimations = (delta)=>{
        this.sceneInventory.updateAnimations(delta);
    }

    updateAvatarAnimations = (delta) =>{
        //update all visible items running animations in sceneInventory
        this.avatars.forEach((item)=>{
            if((item.mixer !== null)){
                item.updateAnimation(delta);
            }
        })
    }    

    updatePhysicsWorld =() =>{
        this.world.step(this.dt); 
        this.world.bodies.forEach( function(body){
            if ( body.threeMesh !== undefined){
                body.threeMesh.position.copy(body.position);
                body.threeMesh.quaternion.copy(body.quaternion);
            }
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

    
    addSpotlight = (pos, targetMesh) =>{
    let spotLight = new THREE.SpotLight( 0xffffff, 10 );
        spotLight.position.copy(pos);
        spotLight.position.y = 10;
        spotLight.angle = Math.PI / 18;
        spotLight.penumbra = 1;
        spotLight.decay = 2;
        spotLight.distance = 100;
        spotLight.target = targetMesh;

      
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
        spotLight2.target = targetMesh;

      
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

            let plotterOpts ={
             camera: this.camera,
             scene: this.scene,
             sceneryLoader: this.sceneryLoader}

            if(this.config.isCurated){
                plotterOpts.ceilY = 60;
                plotterOpts.floorY = -1;

            };

            this.layoutPlotter = new LayoutPlotter(plotterOpts);  
            
            let maxItems =this.layoutPlotter.getMaxItemCount();
            let items2d = options.sceneAssets.filter(nft => ((!nft.is3D)&&(nft.imageURLs[0])));     
            console.log('items2d: ', items2d);

            let maxItems3D =this.layoutPlotter.getMaxItemCount3D();
            console.log('maxItems3D: ',maxItems3D);
            let items3d = options.sceneAssets.filter(nft => nft.is3D);
            console.log('items3d: ', items3d);

            items3d = items3d.concat(spookyNFTs)
            let items3dToRender = items3d.slice(0,maxItems3D);   
            console.log('items3dToRender: ',items3dToRender);
          /*  if(items2d.length===0){
                items2d = items3d.slice(maxItems3D);
                //display 2d images of 3d items if there are no more 2d images
            };*/

/*
            this.loadingScreen.startLoading({items:items2d,
                                        name:'NFTs'});
*/
            let sceneInvConfig = {          
                                animations: this.config.animations,
                                chainAPI: this.config.chainAPI,
                                imageProxyUrl: this.config.imageProxyUrl,    
                                items2d: items2d,
                                items3d: items3dToRender,
                                scene: this.scene,
                                loader: this.loader,
                                loaders: this.loaders,
                                width: 3, // IMPORTANT! Default size for images unless specified in circle layout
                                depth: 0.1,
                                height: 2,
                                modelsRoute: this.config.modelsRoute,
                                nftsRoute: this.config.nftsRoute,
                                layoutPlotter: this.layoutPlotter,
                         //       loadingScreen: this.loadingScreen
                                }

            if(this.world){
                sceneInvConfig.physicsWorld = this.world;
            };

            let haveVRM = this.haveVRM(items3dToRender);
            if(haveVRM){
                sceneInvConfig.animLoader = true;
            };

            this.sceneInventory = new D3DInventory(sceneInvConfig);

        }
        
    }

    haveVRM = (items3dToRender) =>{
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
            animLoader: (opts.animLoader)?opts.animLoader:false,
            height: (opts.height)?opts.height:this.config.scaleModelToHeight,
            width: (opts.width)?opts.width:this.config.scaleModelToWidth,
            depth: (opts.depth)?opts.depth:this.config.scaleModelToDepth,
            modelUrl: opts.modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:extension,
            physicsWorld: (opts.physicsWorld)?opts.physicsWorld:null,
            avatar: (opts.avatar)?opts.avatar:null,
            avatarPath: (opts.avatarPath)?opts.avatarPath:null,
            owner: (opts.owner)?opts.owner:null            
        }

        if(extension.trim().toLowerCase()==='vrm'){
            console.log('avatar is VRM');
            config.animations = this.config.animations;
            config.animLoader = true;
            item = new ItemVRM(config);
        } else {
            console.log('avatar is NOT VRM');

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
                                                console.log('moveLeft triggered');
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.dir = 'l';  
                                            },                                            
                                            moveRight:(data, value)=>{
                                                console.log('moveright triggered');

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
                                            },
                                            rotateRight: (data, value)=>{
                                                that.controlProxy.data = data;
                                                that.controlProxy.value = value;
                                                that.controlProxy.rot = 'rr';
                                            },
                                            triggerLeft:(data, value)=>{
                                            },
                                            triggerRight:(data, value)=>{
                                            },
                                            paddleLeft:(data, value)=>{

                                            },  
                                            paddleRight:(data, value)=>{

                                            },
                                            stopMoving: ()=>{
                                                that.controlProxy.data = null;
                                                that.controlProxy.value = null;
                                                that.controlProxy.dir =null;  
                                            },
                                            cancelRotate: ()=>{
                                                that.controlProxy.isRotating = false;
                                                that.controlProxy.rot = null;
                                            },
                                            onSelectStartLeft: (e,controller)=>{
                                               console.log(controller.line);
                                            },
                                            onSelectEndLeft: (e,controller)=>{
                                            },
                                            onSelectStartRight: (e,controller)=>{
                                               console.log(controller.line);
                                               this.throwSnowBall(e,controller)

                                            },
                                            onSelectEndRight: (e,controller)=>{
                                            }                                            
                                        });

        this.playerVR = new PlayerVR({  controllers: this.vrControls.controllers,
                                        grips: this.vrControls.grips,
                                        camera: this.camera,
                                        controlProxy: this.controlProxy,
                                        playerStartPos: this.player.position.clone(),
                                        sceneCollider: this.sceneryLoader.collider});

        this.scene.add(this.playerVR.dolly);
        this.removePlayer();

    }

    removePlayer = () =>{
        this.player.remove(...this.player.children);
        this.scene.remove(this.player);

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
        }
    }    

    removeFloor = () =>{
        if(this.sceneryMesh){
            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
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

    if(this.sceneryLoader.playerStartPos){
        playerStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z);
    } else {
        playerFloor = this.sceneryLoader.findFloorAt(new THREE.Vector3(0,0,0), 2, -1);
        playerStartPos = new THREE.Vector3(0,playerFloor,0);
    };

    that.player = new THREE.Group();
    that.player.position.copy(playerStartPos);
    that.player.rotation.set(0,0,0);
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.0, 1.0, 1.0, 10, 0.5),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );

    that.character.geometry.translate( 0, -1, 0 );
    that.character.capsuleInfo = {
        radius: (this.config.capsuleRadius)?this.config.capsuleRadius:0.5,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    
    that.character.rotation.set(0,0,0);

    that.player.add(that.character);
    that.character.updateMatrixWorld();
    that.scene.add( that.player );
    that.player.updateMatrixWorld();

}

initPlayerThirdPerson = () => {

     let that = this;
    let playerLoader = new GLTFLoader();
    let newPos = null;
    let playerFloor = 0;
    let playerStartPos;

    if(this.sceneryLoader.playerStartPos){
        playerStartPos = new THREE.Vector3(this.sceneryLoader.playerStartPos.x,this.sceneryLoader.playerStartPos.y,this.sceneryLoader.playerStartPos.z);
    }
        playerFloor = this.sceneryLoader.findFloorAt(playerStartPos, 3, -1);
        playerStartPos.y = playerFloor;

//console.log('playerStartPos with floor',playerStartPos);
//this.addPlaneAtPos(playerFloor);
    that.player = new THREE.Group();
    that.player.position.copy(playerStartPos);
    that.player.rotation.set(0,0,0);
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.0, 2.0, 1.0, 10, 0.5),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );
  //  that.character.position.set(0,-1,0);

    that.character.geometry.translate( 0, -0.5, 0 );
    that.character.capsuleInfo = {
        radius: (this.config.capsuleRadius)?this.config.capsuleRadius:0.5,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    
    that.character.rotation.set(0,0,0);
    that.player.add(that.character);
 
    let avatar = null;
    if(this.config.avatarPath){

        let avatarFile = this.config.avatars[this.config.avatar];
        let path = this.config.avatarPath+this.config.avatar+'/'+avatarFile;
        console.log('full avatar path: ',path)
        console.log(this.config.owner);
        let itemConfig = { avatar: avatar,
                            owner: this.config.owner,
                            avatarPath:this.config.avatarPath+this.config.avatar+'/',
                            animLoader: true,
                            scene: this.scene,
                            format: 'vrm',
                            height:2,
                            width:2,
                            depth:2,
                            modelUrl: path};
                            console.log('avatar config');
                            console.log(itemConfig);
        avatar = that.initItemForModel(itemConfig);
        avatar.place(new THREE.Vector3(0,0,0), this.player).then((model,pos)=>{
                    let avatarHeight = avatar.getImportedObjectSize();
                    avatar.mesh.position.y  = -0.5-(avatarHeight/2); // minus half height minus capsule radius puts it in capsule
            that.player.add(avatar.mesh);
            avatar.mesh.updateMatrixWorld();
            that.scene.add( that.player );
           that.player.position.y=playerFloor;

            that.player.updateMatrixWorld();
            that.player.model = avatar.mesh;
            that.player.avatar = avatar;
            that.avatars.push(avatar);
            let playerHeight2 = that.getImportedObjectSize(that.player);
            console.log('playerHeight2: ',playerHeight2);
            let Yoffset = playerHeight2/2;
            that.player.position.y = playerFloor+Yoffset; // player center is half player height so posision this distance from floor

            var helper = new THREE.BoxHelper(that.player, 0x00ff00);
                helper.update();
                console.log('avatarHeight: ',avatarHeight);
            that.createLabel(this.config.owner.ownerName, that.player, {x:0,y:1,z:0});
            console.log('created label')
            });        
        this.camera.lookAt(this.player);
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

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0x99FFFF, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }

 updatePlayer = ( delta )=> {
    this.playerVelocity.y += this.playerIsOnGround ? 0 : delta * params.gravity;
    this.player.position.addScaledVector( this.playerVelocity, delta );

    // move the player
    const angle = this.controls.getAzimuthalAngle();
    if ( fwdPressed ) {
        this.tempVector.set( 0, 0, - 1 ).applyAxisAngle( this.upVector, angle );
    }

    if ( bkdPressed ) {
        this.tempVector.set( 0, 0, 1 ).applyAxisAngle( this.upVector, angle );
    }

    if ( lftPressed ) {
        this.tempVector.set( - 1, 0, 0 ).applyAxisAngle(  this.upVector, angle );
    }

    if ( rgtPressed ) {
        this.tempVector.set( 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
    }
    
    if(fwdPressed||bkdPressed||lftPressed||rgtPressed){
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );
        this.updatePlayerDirection(delta);         
        if(this.player.avatar){  
            if(!spacePressed){
                  if(this.player.state!='walk'){
                    if((this.player.state==='jump')){
                        if(this.playerIsOnGround){
                             if(this.player.avatar.animLoader.switchAnim('walk')){
                                this.player.state = 'walk';
                                console.log('state set: ',this.player.state);
                            }
                        }
                    } else {
                        if(this.player.avatar.animLoader.switchAnim('walk')){
                            this.player.state = 'walk';
                            console.log('state set: ',this.player.state);
                        }
                    }
                   
                }                 
            }
       
        }

    } else {
        if(this.player.avatar){  
            switch (this.player.state){
                case 'walk':
                case 'run':
                    if(this.player.avatar.animLoader.switchAnim('idle')){
                        this.player.state = 'idle';
                        console.log('state set: ',this.player.state);
                    };                   
                    break;
                case 'jump':
                if(this.playerIsOnGround){
                    if(this.player.avatar.animLoader.switchAnim('idle')){
                        this.player.state = 'idle';
                        console.log('state set: ',this.player.state);
                    };
                };
                break;
                case 'dance':
                case 'dance2':
                case 'dance3':
                break;
            }  
               
        }
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
    if ( this.player.position.y < 0 ) {

        this.reset();

    }

}

updatePlayerDirection = (delta) =>{
    nextPos.copy( this.player.position);
    nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
    this.player.lookAt(nextPos);         
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
if(this.playerIsOnGround){
            this.character.mesh.material.color.set(0xff0000);
        } else {
            this.character.mesh.material.color.set(0xffffff);
        }
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
        if ( this.player.position.y < - 2 ) {

            this.reset();

        };
        fwdPressed = false;
        bkdPressed = false;
        rgtPressed = false;
        lftPressed = false;
    }

    reset = ()=> {
        this.playerVelocity.set( 0, 0, 0 );
        this.player.position.set(this.sceneryLoader.playerStartPos);
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

export {SpaceViewer}

function CannonDebugRenderer(scene, world, options) {
    options = options || {};

    this.scene = scene;
    this.world = world;

    this._meshes = [];

    this._material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    this._sphereGeometry = new THREE.SphereGeometry(1);
    this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this._planeGeometry = new THREE.PlaneGeometry( 10, 10, 10, 10 );
    this._cylinderGeometry = new THREE.CylinderGeometry( 1, 1, 10, 10 );
}

CannonDebugRenderer.prototype = {

    tmpVec0: new CANNON.Vec3(),
    tmpVec1: new CANNON.Vec3(),
    tmpVec2: new CANNON.Vec3(),
    tmpQuat0: new CANNON.Vec3(),

    update () {

        const bodies = this.world.bodies;
        const meshes = this._meshes;
        const shapeWorldPosition = this.tmpVec0;
        const shapeWorldQuaternion = this.tmpQuat0;

        let meshIndex = 0;

        for (let i = 0; i !== bodies.length; i += 1) {
            const body = bodies[i];

            for (let j = 0; j !== body.shapes.length; j += 1) {
                const shape = body.shapes[j];

                this._updateMesh(meshIndex, body, shape);

                const mesh = meshes[meshIndex];

                if (mesh) {

                    // Get world position
                    body.quaternion.vmult(body.shapeOffsets[j], shapeWorldPosition);
                    body.position.vadd(shapeWorldPosition, shapeWorldPosition);

                    // Get world quaternion
                    body.quaternion.mult(body.shapeOrientations[j], shapeWorldQuaternion);

                    // Copy to meshes
                    mesh.position.copy(shapeWorldPosition);
                    mesh.quaternion.copy(shapeWorldQuaternion);
                }

                meshIndex += 1;
            }
        }

        for (let i = meshIndex; i < meshes.length; i += 1) {
            const mesh = meshes[i];
            if (mesh) {
                this.scene.remove(mesh);
            }
        }

        meshes.length = meshIndex;
    },

    _updateMesh (index, body, shape){
        let mesh = this._meshes[index];
        if (!this._typeMatch(mesh, shape)) {
            if (mesh) {
                this.scene.remove(mesh);
            }
            mesh = this._meshes[index] = this._createMesh(shape);
        }
        this._scaleMesh(mesh, shape);
    },

    _typeMatch (mesh, shape){
        if (!mesh) {
            return false;
        }
        const geo = mesh.geometry;
        return (
            (geo instanceof THREE.SphereGeometry && shape instanceof CANNON.Sphere) ||
            (geo instanceof THREE.BoxGeometry && shape instanceof CANNON.Box) ||
            (geo instanceof THREE.PlaneGeometry && shape instanceof CANNON.Plane) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.ConvexPolyhedron) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Trimesh) ||
            (geo.id === shape.geometryId && shape instanceof CANNON.Heightfield)
        );
    },

    _createMesh (shape){
        const material = this._material;
        let geometry, geo, v0, v1, v2, mesh;

        switch(shape.type){

        case CANNON.Shape.types.SPHERE:
            mesh = new THREE.Mesh(this._sphereGeometry, material);
            break;

        case CANNON.Shape.types.BOX:
            mesh = new THREE.Mesh(this._boxGeometry, material);
            break;

        case CANNON.Shape.types.PLANE:
            mesh = new THREE.Mesh(this._planeGeometry, material);
            break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            // Create mesh
            geo = new THREE.Geometry();

            // Add vertices
            for (let i = 0; i < shape.vertices.length; i += 1) {
                const v = shape.vertices[i];
                geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
            }

            for (let i=0; i < shape.faces.length; i += 1) {
                const face = shape.faces[i];

                // add triangles
                const a = face[0];
                for (let j = 1; j < face.length - 1; j += 1) {
                    let b = face[j];
                    let c = face[j + 1];
                    geo.faces.push(new THREE.Face3(a, b, c));
                }
            }
            geo.computeBoundingSphere();
            geo.computeFaceNormals();

            mesh = new THREE.Mesh(geo, material);
            shape.geometryId = geo.id;
            break;

        case CANNON.Shape.types.TRIMESH:
            geometry = new THREE.Geometry();
            v0 = this.tmpVec0;
            v1 = this.tmpVec1;
            v2 = this.tmpVec2;
            for (let i = 0; i < shape.indices.length / 3; i += 1) {
                shape.getTriangleVertices(i, v0, v1, v2);
                geometry.vertices.push(
                    new THREE.Vector3(v0.x, v0.y, v0.z),
                    new THREE.Vector3(v1.x, v1.y, v1.z),
                    new THREE.Vector3(v2.x, v2.y, v2.z)
                );
                let j = geometry.vertices.length - 3;
                geometry.faces.push(new THREE.Face3(j, j+1, j+2));
            }
            geometry.computeBoundingSphere();
            geometry.computeFaceNormals();
            mesh = new THREE.Mesh(geometry, material);
            shape.geometryId = geometry.id;
            break;

        case CANNON.Shape.types.HEIGHTFIELD:
            geometry = new THREE.Geometry();

            v0 = this.tmpVec0;
            v1 = this.tmpVec1;
            v2 = this.tmpVec2;
            for (let xi = 0; xi < shape.data.length - 1; xi += 1) {
                for (let yi = 0; yi < shape.data[xi].length - 1; yi += 1) {
                    for (let k = 0; k < 2; k += 1) {
                        shape.getConvexTrianglePillar(xi, yi, k===0);
                        v0.copy(shape.pillarConvex.vertices[0]);
                        v1.copy(shape.pillarConvex.vertices[1]);
                        v2.copy(shape.pillarConvex.vertices[2]);
                        v0.vadd(shape.pillarOffset, v0);
                        v1.vadd(shape.pillarOffset, v1);
                        v2.vadd(shape.pillarOffset, v2);
                        geometry.vertices.push(
                            new THREE.Vector3(v0.x, v0.y, v0.z),
                            new THREE.Vector3(v1.x, v1.y, v1.z),
                            new THREE.Vector3(v2.x, v2.y, v2.z)
                        );
                        let i = geometry.vertices.length - 3;
                        geometry.faces.push(new THREE.Face3(i, i+1, i+2));
                    }
                }
            }
            geometry.computeBoundingSphere();
            geometry.computeFaceNormals();
            mesh = new THREE.Mesh(geometry, material);
            shape.geometryId = geometry.id;
            break;
        }

        if (mesh) {
            this.scene.add(mesh);
        }

        return mesh;
    },

    _scaleMesh (mesh, shape) {
        let radius;
        switch (shape.type) {

        case CANNON.Shape.types.SPHERE:
            radius = shape.radius;
            mesh.scale.set(radius, radius, radius);
            break;

        case CANNON.Shape.types.BOX:
            mesh.scale.copy(shape.halfExtents);
            mesh.scale.multiplyScalar(2);
            break;

        case CANNON.Shape.types.CONVEXPOLYHEDRON:
            mesh.scale.set(1,1,1);
            break;

        case CANNON.Shape.types.TRIMESH:
            mesh.scale.copy(shape.scale);
            break;

        case CANNON.Shape.types.HEIGHTFIELD:
            mesh.scale.set(1,1,1);
            break;

        }
    }
};