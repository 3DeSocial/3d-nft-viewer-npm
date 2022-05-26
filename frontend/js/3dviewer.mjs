export const name = 'd3dntfviewer';
// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';
import { Rhino3dmLoader  } from 'three/examples/jsm/loaders/3DMLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { AMFLoader } from 'three/examples/jsm/loaders/AMFLoader.js';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { GCodeLoader } from "three/examples/jsm/loaders/GCodeLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRCubeTextureLoader } from "three/examples/jsm/loaders/HDRCubeTextureLoader.js";
import { IFCLoader } from "three/examples/jsm/loaders/IFCLoader.js";
import { KMZLoader } from "three/examples/jsm/loaders/KMZLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { KTXLoader } from "three/examples/jsm/loaders/KTXLoader.js";
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";
import { LogLuvLoader } from "three/examples/jsm/loaders/LogLuvLoader.js";
import { LottieLoader } from "three/examples/jsm/loaders/LottieLoader.js";
import { LUT3dlLoader } from "three/examples/jsm/loaders/LUT3dlLoader.js";
import { LUTCubeLoader } from "three/examples/jsm/loaders/LUTCubeLoader.js";
import { LWOLoader } from "three/examples/jsm/loaders/LWOLoader.js";
import { MD2Loader } from "three/examples/jsm/loaders/MD2Loader.js";
import { MDDLoader } from "three/examples/jsm/loaders/MDDLoader.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { NRRDLoader } from "three/examples/jsm/loaders/NRRDLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";
import { PDBLoader } from "three/examples/jsm/loaders/PDBLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { PRWMLoader } from "three/examples/jsm/loaders/PRWMLoader.js";
import { PVRLoader } from "three/examples/jsm/loaders/PVRLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import { TiltLoader } from "three/examples/jsm/loaders/TiltLoader.js";
import { VOXLoader, VOXMesh } from "three/examples/jsm/loaders/VOXLoader.js";
import { VRMLLoader } from "three/examples/jsm/loaders/VRMLLoader.js";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader.js";
import { XYZLoader } from "three/examples/jsm/loaders/XYZLoader.js";

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import Item from './D3D_Item.mjs';import Lighting from './D3D_Lighting.mjs';
import {MeshBVH, VRButton, VRControls} from '3d-nft-viewer';

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


export class D3DNFTViewerOverlay {
    constructor(config) {

        let defaults = {
                    el: document.body,
                    handlers: {}
                };
        
        this.config = {
            ...defaults,
            ...config
        };

        this.optionsMenu = this.createOptionsMenu(this.el);
        this.addEventListeners();

    }

    createOptionsMenu = () =>{
        const node = document.getElementById("nft-overlay");
        if(node){
            let menu = node.cloneNode(true);
                menu.setAttribute('style','display:inline-block;');
                this.config.el.appendChild(menu);
                return menu;
        } else {
            return false;
        }
    }

    addEventListeners = () =>{
        let that = this;
     
        let floorCbx = this.optionsMenu.querySelector('#floor');
        floorCbx.addEventListener('change',(e)=>{
            if(that.config.handlers['floor']){
                that.config.handlers['floor'](floorCbx.checked);
            }
        });

        let skyCbx = this.optionsMenu.querySelector('#sky');
        skyCbx.addEventListener('change',(e)=>{
            if(that.config.handlers['sky']){
                that.config.handlers['sky'](skyCbx.checked);
            }
        })        
    }
}

export class D3DLoaders {

    constructor(config) {

        let defaults = {
                    defaultLoader: 'gltf'
                };
        
        this.config = {
            ...defaults,
            ...config
        };

    }

    getLoaderForFormat = (format) =>{
        if(!format){
            throw "Loaders:getLoaderForFormat: Unknown format";
        };
        format = format.toLowerCase();
        console.log('getLoaderForFormat: ',format);
        this.loadingManager = new THREE.LoadingManager();
        // add handler for TGA textures
        this.loadingManager.addHandler( /\.tga$/i, new TGALoader() ); 
        let dracoLoader, ddsLoader, ktx2Loader, gltfLoader;
       switch(format){
            case '3dm': 
                let loader = new Rhino3dmLoader(this.loadingManager);
                    loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/' );
                    return loader;
                break;
            case '3ds': return new TDSLoader(this.loadingManager); break;
            case '3mf': return new ThreeMFLoader(this.loadingManager); break;
            case 'amf': return new AMFLoader(this.loadingManager); break;
            case 'bvh': return new BVHLoader(this.loadingManager); break;
            case 'basistexture': return new BasisTextureLoader(this.loadingManager); break;
            case 'dae': return new ColladaLoader(this.loadingManager); break;
            case 'dds': return new DDSLoader(this.loadingManager); break;
            case 'drc': 
                    dracoLoader = new DRACOLoader(this.loadingManager); 
                    dracoLoader.setDecoderPath( '/libs/draco/' );
                    dracoLoader.setDecoderConfig( { type: 'js' } );
                    return dracoLoader;
                break;
            case '3xr': return new EXRLoader(this.loadingManager); break;
            case 'fbx': return new FBXLoader(this.loadingManager); break;
            case 'font': return new FontLoader(this.loadingManager); break;
            case 'gcode': return new GCodeLoader(this.loadingManager); break;
            case 'glb':
            case 'gltf':
                        gltfLoader = new GLTFLoader(this.loadingManager); 
                    
                        dracoLoader = new DRACOLoader(this.loadingManager); 
                        dracoLoader.setDecoderPath( './libs/draco/' );
                        dracoLoader.setDecoderConfig( { type: 'js' } );
                    
                        gltfLoader.setDRACOLoader(dracoLoader);
                    
                        ktx2Loader = new KTX2Loader(this.loadingManager);

                        gltfLoader.setKTX2Loader(ktx2Loader);
                    return gltfLoader;

                break;
            case 'hdrcubetexture': return new HDRCubeTextureLoader(this.loadingManager); break;
            case 'ifc': 
                let ifcLoader = new IFCLoader(this.loadingManager);
                    ifcLoader.ifcManager.setWasmPath( './libs/ifc/' );
                return ifcLoader;
            break;
            case 'kmz': return new KMZLoader(this.loadingManager); break;
            case 'ktx2': return new KTX2Loader(this.loadingManager); break;
            case 'ldraw','mpd': return new LDrawLoader(this.loadingManager); break;
            case 'lut3dl': return new LUT3dlLoader(this.loadingManager); break;
            case 'lutcube': return new LUTCubeLoader(this.loadingManager); break;
            case 'lwo': return new LWOLoader(this.loadingManager); break;
            case 'logluv': return new LogLuvLoader(this.loadingManager); break;
            case 'lottie': return new LottieLoader(this.loadingManager); break;
            case 'md2': return new MD2Loader(this.loadingManager); break;
            case 'mdd': return new MDDLoader(this.loadingManager); break;
            case 'mmd': return new MMDLoader(this.loadingManager); break
            case 'pmd': return new MMDLoader(this.loadingManager); break
            case 'vmd': return new MMDLoader(this.loadingManager); break
            case 'vpd': return new MMDLoader(this.loadingManager); break;
            case 'mtl': return new MTLLoader(this.loadingManager); break;
            case 'nrrd': return new NRRDLoader(this.loadingManager); break;
            case 'obj': return new OBJLoader(this.loadingManager); break;
            case 'pcd': return new PCDLoader(this.loadingManager); break;
            case 'pdb': return new PDBLoader(this.loadingManager); break;
            case 'ply': return new PLYLoader(this.loadingManager); break;
            case 'prwm': return new PRWMLoader(this.loadingManager); break;
            case 'pvr': return new PVRLoader(this.loadingManager); break;
            case 'rgbe': return new RGBELoader(this.loadingManager); break;
            case 'rgbm': return new RGBMLoader(this.loadingManager); break;
            case 'stl': return new STLLoader(this.loadingManager); break;
            case 'svg': return new SVGLoader(this.loadingManager); break;
            case 'tds': return new TDSLoader(this.loadingManager); break;
            case 'tga': return new TGALoader(this.loadingManager); break;
            case 'ttf': return new TTFLoader(this.loadingManager); break;
            case 'tilt': return new TiltLoader(this.loadingManager); break;
            case 'vox': return new VOXLoader(this.loadingManager); break;
            case 'vrml': case 'wrl': return new VRMLLoader(this.loadingManager); break;
            case 'vtk': return new VTKLoader(this.loadingManager); break;
            case 'xyz': return new XYZLoader(this.loadingManager); break;
            default: return false; break;
       }

    }    

}

 export default class D3DNFTViewer {
    
    constructor(config) {

        let defaults = {
                    el: document.body,
                    ctrClass: 'data-nft', // Attribute of div containing nft preview area for a single nft
                    fitOffset: 1.25,
                    nftsRoute: 'nfts', // Back end route to initialize NFTs
                    modelsRoute: 'models',// Back end route to load models
                    sceneryPath: '/layouts/round_showroom/scene.gltf',
                    skyboxPath: '',
                    controls: {
                        maxDistance:Infinity,
                        maxPolarAngle:Infinity
                    },
                    useOwnHandlers: false
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
        environment = null;
        collider = null;

    }

    setFormat = (format) =>{
        console.log('setFormat: ',format);
        let loader = this.loaders.getLoaderForFormat(format);
        if(loader === false){
            throw('Error - No Loader Availble for File Format: '+format+' in D3DNFTViewer');
            return false;
        };
        console.log('set loader');
        this.format = format;
        this.loader = loader;
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
        console.log('clearMesh: ',this.loadedItem.mesh);
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
        console.log('container el: ',parentDivEl);

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
        if(this.config.useShowroom){
            this.sceneryLoader = this.loaders.getLoaderForFormat('gltf');
            this.loadColliderEnvironment();
        };
        this.initCamera();
        this.initRenderer(parentDivEl);
        this.initLighting();
        this.initPlayer();
        this.initControls();
        this.addListeners();
        this.containerInitialized = true;

    }


    initCamera = () =>{
 
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/600, 0.01, 1000 );
        //Only gotcha. Set a non zero vector3 as the camera position.
        this.camera.position.set(10, 8, 40);
        this.camera.lookAt(0,0,0);

    }

    initControls = () =>{
        //Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.restrictCameraToRoom();
        this.controls.addEventListener('change', this.render);
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
        this.renderer = new THREE.WebGLRenderer({antialias: true,
                alpha: true,
                preserveDrawingBuffer: true});

        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        //the following increases the resolution on Quest
        this.renderer.xr.setFramebufferScaleFactor(2.0);

        this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        this.renderer.setClearColor( 0x000000, 1 );
        this.renderer.domElement.style.display = 'none';

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
        let overlay = new D3DNFTViewerOverlay({
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

    getRandomInt (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    loadSkyBox(boxname){
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
            console.log('resizing');
            console.log('this.parentDivEl:',this.parentDivEl);
            console.log('this.parentDivElWidth: ',this.parentDivElWidth);
            console.log('this.parentDivElHeight: ',this.parentDivElHeight);            
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        };
        if(this.loadedItem){
           this.fitCameraToMesh(this.loadedItem);        
        }
    }

        
        
    animate = () =>{
        this.renderer.setAnimationLoop(this.render);
    }
    
    render = () =>{
        if (this.renderer.xr.isPresenting === true) {
            this.vrControls.checkControllers();

        };

            const delta = Math.min( this.clock.getDelta(), 0.1 );
            if ( params.firstPerson ) {

          /*      this.controls.maxPolarAngle = Math.PI;
                this.controls.minDistance = 1e-4;
                this.controls.maxDistance = 1e-4;
*/
            } else {
/*
                this.controls.maxPolarAngle = Math.PI / 2;
                this.controls.minDistance = 1;
                this.controls.maxDistance = 20;
*/
            }

              if ( collider ) {
//console.log('got collider');
                collider.visible = params.displayCollider;
             //   visualizer.visible = params.displayBVH;

                const physicsSteps = params.physicsSteps;

                for ( let i = 0; i < physicsSteps; i ++ ) {

                    this.updatePlayer( delta / physicsSteps );

                }

            } else {
  //              console.log('no collider');
            }

            // TODO: limit the camera movement based on the collider
            // raycast in direction of camera and move it if it's further than the closest point

          //  this.controls.update();
          if(this.loadedItem){
              if((this.loadedItem.mixer !== null)){
                    this.loadedItem.mixer.update( delta );
                };
            }

        this.renderer.render(this.scene, this.camera);
    }

    

     fitCameraToMesh(loadedItem) {

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

        //this.showOverlay();
        this.initVR();
        this.animate();        
    }


    initInventory = () =>{

        this.inventory = new D3DInventory({ three: THREE,
                                            items: this.config.items,
                                            scene: this.scene,
                                            loader: this.loader});
    }

    initItem = (nftPostHashHex) =>{

        this.loadedItem = new Item({
            three: THREE,
            scene: this.scene,
            height: this.config.scaleModelToHeight,
            width: this.config.scaleModelToWidth,
            depth: this.config.scaleModelToDepth,
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute
        });
        return this.loadedItem;

    }

    initItemForModel = (modelUrl) =>{
        let urlParts = modelUrl.split('.');
        let extension = urlParts[urlParts.length-1];

        this.loadedItem = new Item({
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
        return this.loadedItem;

    }

    initVR = () =>{

        let that = this;
        
        VRButton.registerSessionGrantedListener();        
        
        let vrButtonEl = VRButton.createButton(this.renderer);

        this.vrControls = new VRControls({  scene:this.scene,
                                            renderer: this.renderer,
                                            camera: this.camera,
                                            moveUp: function(){

                                            },
                                            moveDown: function(){

                                            },
                                            moveLeft: function(){
                                                lftPressed = true;
                                            },
                                            moveRight: function(){
                                                rgtPressed = true;
                                            },
                                            moveForward: function(){
                                                console.log('fwd detecte');
                                                fwdPressed = true;
                                            },
                                            moveBack: function(){
                                                bkdPressed = true;
                                            },
                                            rotateLeft: function(){
                                                that.player.rotateY(THREE.Math.degToRad(1));
                                                that.dolly.rotateY(THREE.Math.degToRad(1));
                                            },
                                            rotateRight: function(){
                                                that.player.rotateY(-THREE.Math.degToRad(1));
                                                that.dolly.rotateY(-THREE.Math.degToRad(1));
                                            }
                                        });
            this.dolly = this.vrControls.buildControllers();        
    }

    loadColliderEnvironment =() =>{
        var that = this;
        this.sceneryLoader.load(this.config.sceneryPath, res => {

            const gltfScene = res.scene;
            console.log('gltfScene');
            gltfScene.scale.set(0.2,0.2,0.2);    

            console.log(gltfScene);
         //   gltfScene.scale.setScalar( .01 );

            const box = new THREE.Box3();
            box.setFromObject( gltfScene );
            box.getCenter( gltfScene.position ).negate();
            gltfScene.updateMatrixWorld( true );

            // visual geometry setup
            const toMerge = {};
            gltfScene.traverse( c => {

                if ( c.isMesh ) {
                    console.log('mesh found');
                    const hex = c.material.color.getHex();
                    toMerge[ hex ] = toMerge[ hex ] || [];
                    toMerge[ hex ].push( c );

                }

            } );

            environment = new THREE.Group();
            for ( const hex in toMerge ) {

                const arr = toMerge[ hex ];
                const visualGeometries = [];
                arr.forEach( mesh => {

                    if ( mesh.material.emissive.r !== 0 ) {

                        environment.attach( mesh );

                    } else {

                        const geom = mesh.geometry.clone();
                        geom.applyMatrix4( mesh.matrixWorld );
                        visualGeometries.push( geom );

                    }

                } );

                if ( visualGeometries.length ) {

                    const newGeom = BufferGeometryUtils.mergeBufferGeometries( visualGeometries );
                    const newMesh = new THREE.Mesh( newGeom, new THREE.MeshStandardMaterial( { color: parseInt( hex ), shadowSide: 2 } ) );
                    newMesh.castShadow = true;
                    newMesh.receiveShadow = true;
                    newMesh.material.shadowSide = 2;

                    environment.add( newMesh );

                }

            }

            // collect all geometries to merge
            const geometries = [];


            environment.updateMatrixWorld( true );
            environment.traverse( c => {

                if ( c.geometry ) {
                    const cloned = c.geometry.clone();
                    cloned.applyMatrix4( c.matrixWorld );
                    for ( const key in cloned.attributes ) {

                        if ( key !== 'position' ) {

                            cloned.deleteAttribute( key );

                        }

                    }

                    geometries.push( cloned );

                }

            } );

            // create the merged geometry
            const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( geometries, false );
            mergedGeometry.boundsTree = new MeshBVH( mergedGeometry, { lazyGeneration: false } );

            collider = new THREE.Mesh( mergedGeometry );
            collider.material.wireframe = false;
            collider.material.opacity = 0;
            collider.material.transparent = true;

         //   visualizer = new MeshBVHVisualizer( collider, params.visualizeDepth );

            collider.position.set(0,3,0);   
         //   this.scene.add( visualizer );
            this.scene.add( collider );
            //environment.position.set(0,0,0);    
         //   this.scene.add( environment );
           //gltfScene.position.set(0,-11.5,0)
            gltfScene.position.set(0,0,0); 

            this.scene.add(gltfScene);

console.log('added environment');
        } );

    }

    addScenery = () =>{
        let that = this;
        if(this.sceneryMesh){
            this.scene.add(this.sceneryMesh);
        }
        let modelURL = this.config.sceneryPath;
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

    removeFloor = () =>{
        if(this.sceneryMesh){
            this.scene.remove(this.sceneryMesh);
            this.unRestrictCamera();
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

initPlayer = () => {
        // character

        let mat = new THREE.MeshStandardMaterial();
            mat.opacity = 0;
            mat.transparent = true;

        this.player = new THREE.Mesh(
            new THREE.BoxGeometry( 1, 1, 1),
            mat
        );

        this.player.capsuleInfo = {
            radius: 0.75,
            segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0, - 1.0, 0.0 ) )
        };
     /*   this.player.castShadow = true;
        this.player.receiveShadow = true;
        this.player.material.shadowSide = 2;*/
        this.player.rotateY(0);
    
        this.player.position.set(0, 4, 6);
        this.scene.add( this.player );        
      /*  this.reset();*/
    }

    updatePlayer = (delta) =>{

        this.playerVelocity.y += this.playerIsOnGround ? 0 : delta * params.gravity;
        this.player.position.addScaledVector( this.playerVelocity, delta );

        // move the this.player
        //const angle = this.controls.getAzimuthalAngle(); // directio camera looking
        const angle = this.player.rotation.y;
    // console.log('x',this.player.rotation.x,'y',this.player.rotation.y,'z',this.player.rotation.z);
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
  //      this.camera.position.set(this.player.position);

        this.player.updateMatrixWorld();

        // adjust this.player position based on collisions
        const capsuleInfo = this.player.capsuleInfo;
        this.tempBox.makeEmpty();
        this.tempMat.copy( collider.matrixWorld ).invert();
        this.tempSegment.copy( capsuleInfo.segment );

        // get the position of the capsule in the local space of the collider
        this.tempSegment.start.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );
        this.tempSegment.end.applyMatrix4( this.player.matrixWorld ).applyMatrix4( this.tempMat );

        // get the axis aligned bounding box of the capsule
        this.tempBox.expandByPoint( this.tempSegment.start );
        this.tempBox.expandByPoint( this.tempSegment.end );

        this.tempBox.min.addScalar( - capsuleInfo.radius );
        this.tempBox.max.addScalar( capsuleInfo.radius );

        collider.geometry.boundsTree.shapecast( {

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
        newPosition.copy( this.tempSegment.start ).applyMatrix4( collider.matrixWorld );

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


        // adjust the this.camerainit
    //    this.camera.position.sub( this.controls.target );
      //  this.controls.target.copy( this.player.position );
        //this.camera.position.add( this.player.position );

        // if the this.player has fallen too far below the level reset their position to the start
        if ( this.player.position.y < - 25 ) {

            this.reset();

        }
        fwdPressed = false;
        bkdPressed = false;
        rgtPressed = false;
        lftPressed = false;
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
}
export {D3DNFTViewer}