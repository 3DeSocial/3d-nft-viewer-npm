export const name = 'd3dntfviewer';
// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import {ItemVRM, Item, Lighting, SceneryLoader, NFTViewerOverlay, D3DLoaders, VRButton, VRControls, SkyBoxLoader} from '3d-nft-viewer';

let clock, gui, stats, delta;
let environment, collider, visualizer, player, controls, geometries;
let playerIsOnGround = false;
let fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false;

const params = {

    firstPerson: true,
    displayCollider: false,
    displayBVH: false,
    visualizeDepth: 10,
    gravity: - 30,
    playerSpeed: 10,
    physicsSteps: 5,
    useShowroom: true

};

 export default class D3DNFTViewer {
    
    constructor(config) {

        let defaults = {
                    animations: ['/mixamo/Arm_Stretching.fbx', '/mixamo/Looking_Around.fbx','/mixamo/Strut_Walking.fbx','/mixamo/Dancing_Twerk.fbx','/mixamo/Flair.fbx','/mixamo/Headspin_Start.fbx','/mixamo/HipHop_Dancing.fbx','/mixamo/Strut_Walking.fbx','/mixamo/Victory.fbx'],
                    firstPerson: true,
                    bgColor: 0x000000,
                    el: document.body,
                    ctrClass: 'data-nft', // Attribute of div containing nft preview area for a single nft
                    fitOffset: 1.25,
                    nftsRoute: 'nfts', // Back end route to initialize NFTs
                    modelsRoute: 'models',// Back end route to load models
                    sceneryPath: '/layouts/round_showroom/scene.gltf',
                    skyboxPath: '',
                    skyBoxList: ['blue','bluecloud','browncloud','lightblue','yellowcloud'],
                    skyBox: 'blue',
                    controls: {
                        maxDistance:Infinity,
                        maxPolarAngle:Infinity
                    },
                    vrType: 'walking',
                    useOwnHandlers: false,
                    images: [] //holds user image for adding to scene
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
        this.vrType = this.config.vrType,
        this.images = this.config.images
        environment = null;
        collider = null;
        this.helperRoot = new THREE.Group();
        this.helperRoot.renderOrder = 10000;

    }

    setFormat = (format) =>{
        let loader = this.loaders.getLoaderForFormat(format);
        if(loader === false){
            throw('Error - No Loader Availble for File Format: '+format+' in D3DNFTViewer');
            return false;
        };
        if(format.toLowerCase()==='vrm'){
            this.scene.add( this.helperRoot );
            console.log('vrm detected in viewer, using new method');
            loader.register( ( parser ) => {

            return new VRMLoaderPlugin( parser, { helperRoot: this.helperRoot, autoUpdateHumanBones: true } );

        });
        }
        this.format = format;
        this.loader = loader;
    }

    setVrType = (vrType) => {
        console.log('vrType: ',vrType);
        this.vrType = vrType;
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
        if(this.loadedItem){
            if(this.loadedItem.mesh){
                obj = this.loadedItem.mesh;
                this.recursiveDestroy(obj,cb);                
            }
        }
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
        this.initScene();
        this.clock = new THREE.Clock();
        this.initSkybox();
        if(this.config.bgColor){
            this.setBgColor(this.config.bgColor);
        };

        this.initCamera();
        this.initRenderer(parentDivEl);
        this.initLighting();
        this.initControls();
        this.containerInitialized = true;

    }


    initCamera = () =>{
 
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/600, 0.01, 1000 );
        //Only gotcha. Set a non zero vector3 as the camera position.
        this.camera.position.set(0, 4, 12);
        this.camera.lookAt(0,0,0);

    }

    initControls = () =>{
        //Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.restrictCameraToRoom();
        this.controls.update();
    }

    restrictCameraToRoom = () => {
        console.log('restrictCameraToRoom', this.config.controls);
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
        this.renderer.domElement.style.display = 'none';
        this.renderer.domElement.id='3d-nft-canvas';

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
            this.skyBoxLoader = new SkyBoxLoader({
                scene: this.scene,
                skyBoxPath: this.config.skyboxPath,
                skyBoxList: this.config.skyBoxList
            });
            if(this.config.skyBox){
                this.skyBoxLoader.setSkyBox(this.config.skyBox);
            } else {
                this.skyBoxLoader.setRandomSkyBox();
            }
        };
    }


    addSky = () =>{
        this.skyBoxLoader.setRandomSkyBox();
    }

    setSkyBox = (skyBoxName) =>{
        if(!this.skyBoxLoader){
            this.skyBoxLoader = new SkyBoxLoader({
                scene: this.scene,
                skyBoxPath: this.config.skyboxPath,
                skyBoxList: this.config.skyBoxList
            });            
        }
        this.skyBoxLoader.setSkyBox(skyBoxName);
    }

    getSkyPreviewPath = (skyBoxName) =>{
        if(!this.skyBoxLoader){
            this.skyBoxLoader = new SkyBoxLoader({
                scene: this.scene,
                skyBoxPath: this.config.skyboxPath,
                skyBoxList: this.config.skyBoxList
            });            
        };
        return this.skyBoxLoader.getSkyPreviewPath(skyBoxName);
    }

    setBgColor = (color)=>{
        if(color instanceof THREE.Color){
            this.scene.background = color;
        } else {
            color = new THREE.Color('#'+color);
            this.scene.background = color;
        }
    }
    removeSky = () => {
        this.scene.background = null;
    }

    initLighting = () =>{
        this.lights = new Lighting({scene:this.scene,
                                        createListeners: true});   
    }

    initLoaders = () =>{
        //Loader GLTF
        this.loader = this.loaders.getLoaderForFormat(this.config.defaultLoader);      
    }

    addListeners = ()=>{
        this.addEventListenerResize();
        this.addEventListenerContextLost();
        this.addEventListenerExitFullScreen();
       // this.addEventListenerKeys();
    }    

    addEventListenerKeys = ()=>{
        let that = this;
       // this.addEventListenerResize();
      // this.addEventListenerExitFullScreen();

        window.addEventListener( 'keydown', function ( e ) {

                switch ( e.code ) {

                    case 'KeyW': fwdPressed = true; break;
                    case 'KeyS': bkdPressed = true; break;
                    case 'KeyD': rgtPressed = true; break;
                    case 'KeyA': lftPressed = true; break;
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



    addEventListenerResize = () =>{

        window.addEventListener('resize', this.resize.bind(this), false);
    }

    addEventListenerContextLost = () =>{
        let context = this.renderer.getContext();
        if(context){
            if(context.canvas){
               context.canvas.addEventListener("webglcontextlost", this.onLostContext);
            }
        }
    }

    onLostContext = (e)=>{
        e.preventDefault();
        console.log('lost Context!', e);
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
    }

        
        
    animate = () =>{
        this.renderer.setAnimationLoop(this.render);
    }
    
    render = () =>{
        
        const delta = Math.min( this.clock.getDelta(), 0.1 );

        if (this.renderer.xr.isPresenting === true) {
            this.vrControls.checkControllers();
   

            if ( params.firstPerson ) {

                this.controls.maxPolarAngle = Math.PI;
                this.controls.minDistance = 1e-4;
                this.controls.maxDistance = 1e-4;

            } else {

                this.controls.maxPolarAngle = Math.PI / 2;
                this.controls.minDistance = 1;
                this.controls.maxDistance = 20;

            }

             if ( this.collider ) {
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

                };
            }
        };
            // TODO: limit the camera movement based on the this.collider
            // raycast in direction of camera and move it if it's further than the closest point

          //  this.controls.update();
          if(this.loadedItem){
              if((this.loadedItem.mixer !== null)){
                    this.loadedItem.mixer.update( delta );
                    // only update mesh if required by animation
                    if(this.loadedItem.mesh.update){
                        this.loadedItem.mesh.update();
                    };

                };


            }

        this.renderer.render(this.scene, this.camera);
    }

    fitCameraToMesh(loadedItem) {
        if(!loadedItem.mesh){
            return false;
        };

        let mesh = loadedItem.mesh;
        if(mesh.scene){
            mesh = mesh.scene;
        }

        const box = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * this.camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / this.camera.aspect;

        const distance = this.config.fitOffset * Math.max(fitHeightDistance, fitWidthDistance);
        console.log('calculated camera distance: ', distance);
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
        console.log('this.camera.position');
        console.log(this.camera.position);
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
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            that.updateLink(el,'Loading..');
            that.initContainer(targetEl);
            let item = that.initItemForModel({modelUrl:modelUrl});
            let newPos = new THREE.Vector3(0,3.7,0);
            item.place(newPos).then((model,pos)=>{
                that.resizeCanvas();
                previewImg.style.display = 'none';
                this.renderer.domElement.style.display = 'inline-block';
                if(item.mixer){
                console.log('this item has a mixer');
            } else {
                console.log('this item has NO animation mixer');

            }
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

            this.loadedItem = this.initItemForModel(opts);
 
            if(this.config.useShowroom && !this.showroomLoaded){
                this.loadSceneryWithCollider().then(()=>{
                    this.controls.maxPolarAngle = Math.PI / 2;
                    this.controls.minDistance = 1;
                    this.controls.maxDistance = 16;
                    this.placeModel(this.loadedItem).then((item)=>{
                        this.fitCameraToMesh(item);
                        this.removeLoader(hideElOnLoad);
                        resolve(item);                        
                    })
                })
            } else {
                this.placeModel(this.loadedItem).then((item)=>{
                    this.removeLoader(hideElOnLoad);
                    this.fitCameraToMesh(item);
                    resolve(item);

                })
            };
        });

    }


    loadSceneryWithCollider= () =>{
        let that = this;
        console.log('loadSceneryWithCollider');
        return new Promise((resolve,reject)=>{
            this.sceneryLoader = new SceneryLoader({
                sceneScale: that.config.sceneScale,
                sceneryPath: that.config.sceneryPath,
                scene: that.scene,
                castShadow: false,
                receiveShadow:false
            });

            this.sceneryLoader.loadScenery()
            .then((gltf)=>{
                this.collider = that.sceneryLoader.collider;
                that.sceneryMesh = gltf;
                that.showroomLoaded = true;
                resolve(gltf);
            })
        });
    }

    loadNFT = (opts) =>{

        let that = this;
        return new Promise((resolve,reject)=>{

            let hideElOnLoad = opts.hideElOnLoad;
            let modelUrl = opts.modelUrl;
            let containerId = opts.containerId;
            let container = document.getElementById(containerId);
            that.initContainer(container);

            let item = this.initItem(opts);            
            if(this.config.useShowroom && !this.showroomLoaded){

                this.loadSceneryWithCollider().then((item)=>{
                    this.restrictCameraToRoom();
                    this.placeModel(item).then(()=>{
                        console.log('model placed by viewer');
                        this.removeLoader(hideElOnLoad);
                        resolve(item);
                    })

                })

            } else {
                this.placeModel(item).then(()=>{
                    console.log('no scenery: model placed by viewer');                    
                    this.removeLoader(hideElOnLoad);
                    resolve(item);

                })
            };
        });

    }
    
    // Place model in center of space at 0,floorY,0
    placeModel = (item) =>{
        let that = this;
        return new Promise((resolve,reject)=>{
            let floorY = 0;
            if(this.sceneryLoader){ // TO DO - improve by using 0-half mesh height
                floorY = this.sceneryLoader.getFloorY(); // use detected floor Y
            };
            let newPos = new THREE.Vector3(0,floorY,0);
            item.place(newPos).then((model,pos)=>{
                that.mesh = model;
                that.resizeCanvas();
                resolve(item, model, pos);
            });
        });
    }

    removeLoader = (hideElOnLoad) =>{
        let img = document.querySelector('#'+hideElOnLoad);
        if(img){
            img.style.display = 'none';
        };
        this.renderer.domElement.style.display = 'inline-block';        
    }
    start3D = () =>{
        // start animation / controls
        //this.parentDivEl.children[0].setAttribute('style','display:none;');                    
      //  this.renderer.domElement.setAttribute('style','display:inline-block;');            
        this.addListeners();   
        this.initVR();
        this.animate();        
    }


    initInventory = () =>{

        this.inventory = new D3DInventory({ three: THREE,
                                            items: this.config.items,
                                            scene: this.scene,
                                            loader: this.loader});
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


        this.loadedItem = new Item(itemParams);                
        return this.loadedItem;

    }

    initItemForModel = (opts) =>{
        let format = opts.format;
        let item;
        if(typeof(format)==='undefined'){
            let urlParts = opts.modelUrl.split('.');
            format = urlParts[urlParts.length-1];            
        };
        let modelUrl = opts.modelUrl;
        let config = {
            three: THREE,
            loader: this.loaders.getLoaderForFormat(format),
            scene: this.scene,
            height: this.config.scaleModelToHeight,
            width: this.config.scaleModelToWidth,
            depth: this.config.scaleModelToDepth,
            modelUrl: modelUrl,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            format:format
        };

        if(format==='vrm'){
            config.animLoader = true; //load anims to apply to model
            item = new ItemVRM(config);
        } else {
            item = new Item(config);
        };

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
                                console.log('start session walking');
                                console.log('player rotation', this.player.rotation);
                                console.log('camera.rotation', this.camera.rotation);
                                console.log('character rotation',this.character.rotation);
                                let vrType = that.getVrTypeFromUI();
                                console.log('180 degrees later: ',that.camera.rotation);

                                that.buildDolly(vrType);                                
                            } }
        let vrButtonEl = VRButton.createButton(this.renderer, vrBtnOptions);

    }

    getVrTypeFromUI = () =>{
        let selectedVrType = 'flying';
        let vrTypeSelect = document.getElementById('vrType');
        if(vrTypeSelect){
            selectedVrType = vrTypeSelect.options[vrTypeSelect.selectedIndex].value;
        } else {
            console.log('no vr type selection so fly by default');
        };
        return selectedVrType;
    }

    buildDolly = (vrType) =>{
        if(vrType){
            this.setVrType(vrType);
        };
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

    getFloorLevel = (meshToCheck) =>{
        const invMat = new THREE.Matrix4();
        invMat.copy( this.sceneryMesh.matrixWorld ).invert();

        let origin = new THREE.Vector3(0,100,0);
        let dest = new THREE.Vector3(0,-100,0);
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        let raycaster = new THREE.Raycaster();
        raycaster.ray.applyMatrix4( invMat );
        raycaster.set(origin,dir);
        const hit = this.bvh.raycastFirst( raycaster.ray );
       // hit.point.applyMatrixWorld( this.sceneryMesh.matrixWorld );
                 let planePos = new THREE.Vector3(0,hit.point.y,0);
             //   this.addPlaneAtPos(planePos);
//this.scene.add(new THREE.ArrowHelper( raycaster.ray.direction, raycaster.ray.origin, 200, Math.random() * 0xffffff ));
        return hit.point.y;

    }

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0xFF6666, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }
    addScenery = () =>{
        let that = this;
        if(this.sceneryMesh){

            this.scene.add(this.sceneryMesh);
            this.restrictCameraToRoom();
        } else {
            this.loadSceneryWithCollider().then(()=>{
                if(this.loadedItem){
                    let floorY = this.sceneryLoader.getFloorY();
                    let newPos = new THREE.Vector3(0,floorY,0);
        
                    this.loadedItem.moveTo(newPos);
                    that.resizeCanvas();                    
                    this.restrictCameraToRoom();                        
                }
            });
        }
        
    }

    removeScenery = () =>{
        if(this.sceneryMesh){
            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
        };
    }    

    removeFloor = () =>{
        this.removeScenery();
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

    if(this.config.playerStartPos){
        playerStartPos = new THREE.Vector3(this.config.playerStartPos.x,this.config.playerStartPos.y,this.config.playerStartPos.z);
    } else {
        playerFloor = this.sceneryLoader.findFloorAt(new THREE.Vector3(0,0,0), 2, -1);
        playerStartPos = new THREE.Vector3(0,playerFloor,0);
    };

    that.player = new THREE.Group();
    that.player.position.copy(playerStartPos);
    that.character = new THREE.Mesh(
        new RoundedBoxGeometry(  1.5, 1.5, 1.5, 10, 0.5),
        new THREE.MeshStandardMaterial({ transparent: true, opacity: 0})
    );

    that.character.geometry.translate( 0, -1, 0 );
    that.character.capsuleInfo = {
        radius: 2,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
    };    

    that.player.add(that.character);
    that.character.updateMatrixWorld();
    that.scene.add( that.player );
    that.player.updateMatrixWorld();

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
        radius: 0.75,
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
        this.player.lookAt(nextPos);
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );
    }

    if ( bkdPressed ) {

        this.tempVector.set( 0, 0, 1 ).applyAxisAngle( this.upVector, angle );
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        this.player.lookAt(nextPos);      
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );

    }

    if ( lftPressed ) {

        this.tempVector.set( - 1, 0, 0 ).applyAxisAngle(  this.upVector, angle );
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        this.player.lookAt(nextPos);
        this.player.position.addScaledVector( this.tempVector, params.playerSpeed * delta );

    }

    if ( rgtPressed ) {

        this.tempVector.set( 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
       nextPos.copy( this.player.position);
       nextPos.addScaledVector( this.tempVector, params.playerSpeed * delta );      
        this.player.lookAt(nextPos);
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
    this.controls.target.copy( this.player.position );
    this.camera.position.add( this.player.position );
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
        this.player.position.addScaledVector( this.playerVelocity, delta );
          
        if ( fwdPressed ) {
            //this.tempVector.set( 0, 0, - 1 ).applyAxisAngle( this.upVector, angle );
            this.player.translateZ(-params.playerSpeed * delta );
        }

        if ( bkdPressed ) {

            //this.tempVector.set( 0, 0, 1 ).applyAxisAngle( this.upVector, angle );
            this.player.translateZ(params.playerSpeed * delta );
        }

        if ( lftPressed ) {

         //   this.tempVector.set( - 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
            this.player.translateX(-params.playerSpeed * delta );
        }

        if ( rgtPressed ) {

           // this.tempVector.set( 1, 0, 0 ).applyAxisAngle( this.upVector, angle );
            this.player.translateX(params.playerSpeed * delta );
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
            if(this.showroomLoaded){
               this.playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( this.playerVelocity ) );
            };

        } else {

            this.playerVelocity.set( 0, 0, 0 );

        }
        if(this.player.position){
                
            /* TO DO - fix this issue for avatar direction */
            if(this.player.position.x){
                    let playerx = this.player.position.x;
                    let playery = this.player.position.y;
                    let playerz = this.player.position.z;
         
                    this.dolly.position.set(playerx,(playery+0.5),playerz);
                    this.dolly.rotation.copy(this.player.rotation);
            }
        };
        


        // adjust the this.camerainit
        this.camera.position.sub( this.controls.target );
        this.controls.target.copy( this.player.position );
        this.camera.position.add( this.player.position );

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
        this.player.position.copy(this.config.playerStartPos);
        this.camera.position.set(this.config.playerStartPos);
        this.camera.position.setY(this.camera.position.y+1);
       // this.camera.position.set( this.player.position );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );
   //     this.controls.update();

    }    
}
export {D3DNFTViewer}