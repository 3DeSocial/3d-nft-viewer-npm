export const name = 'd3dntfviewer';
// Find the latest version by visiting https://cdn.skypack.dev/three.
import * as THREE from 'three';

import { OrbitControls } from 'https://unpkg.com/three@0.139.1/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.139.1/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from '/js/DSO_VRButton.js';
import { VRControls } from '/js/D3D_VRControls.js';

class D3DNFTViewerOverlay {
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
        let menu = node.cloneNode(true);
            menu.setAttribute('style','display:inline-block;');
            this.config.el.appendChild(menu);
        return menu;
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

 class D3DNFTViewer {
    
    constructor(config) {

        let defaults = {
                    el: document.body,
                    ctrClass: 'data-nft', // Attribute of div containing nft preview area for a single nft
                    fitOffset: 1.25,
                    nftsRoute: 'nfts', // Back end route to initialize NFTs
                    modelsRoute: 'models'// Back end route to load models
                };
        
        this.config = {
            ...defaults,
            ...config
        };
       
        this.isFullScreen = false;
        this.floorPlane = null;

    }
    
    initContainer(parentDivEl){
        //First lets create a parent DIV
        this.parentDivEl = parentDivEl;

        this.parentDivElWidth = this.parentDivEl.children[0].offsetWidth;
        this.parentDivElHeight = this.parentDivEl.children[0].offsetHeight;

        //Lets create a new Scene
        this.scene = new THREE.Scene();
        this.initSkybox();
        this.initCamera();
        this.initRenderer();
        this.initLighting();
        this.initLoaders();
        this.initControls();
        this.addListeners();

    }

    initCamera = () =>{
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/this.parentDivElHeight, 0.01, 1000 );
        //Only gotcha. Set a non zero vector3 as the camera position.
        this.camera.position.set(10, 8, 40);

    }

    initControls = () =>{
        //Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.addEventListener('change', this.render);
        this.controls.update();        
    }

    initRenderer = () =>{
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
        this.renderer.domElement.setAttribute('style','display:none;');
        this.parentDivEl.appendChild(this.renderer.domElement);

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
        //Add lights
        this.hlight = new THREE.AmbientLight(0xffffff);
        this.scene.add(this.hlight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-4, 15, 10);
        this.scene.add(directionalLight);
    }

    initLoaders = () =>{
        //Loader GLTF
        console.log('init loader');
        this.gltfLoader = new GLTFLoader();        
    }

    addListeners = ()=>{
        this.addEventListenerResize();
        this.addEventListenerExitFullScreen();
    }    

    showOverlay =()=>{

        let that = this;
        let overlay = new D3DNFTViewerOverlay({
            el: this.parentDivEl,
            handlers: {
                floor: (checked)=>{
                    if(checked){
                        that.addFloor();
                    } else {
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

        let skybox ='';

        const loader = new THREE.CubeTextureLoader();
              loader.setPath( '/images/skyboxes/'+boxname+'/' );

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
            console.log('enter full screen');
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
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        }
        this.fitCameraToMesh(this.nftMesh);        
    }

        
        
    animate = () =>{
        console.log('animate');
        console.log('isPresenting: ' + this.renderer.xr.isPresenting);
        this.renderer.setAnimationLoop(this.render);
    }
    
    render = () =>{
        if (this.renderer.xr.isPresenting === true) {
            this.vrControls.dollyMove();
        };
        this.renderer.render(this.scene, this.camera);
    }

    

     fitCameraToMesh(mesh) {

        const box = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * this.camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / this.camera.aspect;

        const distance = this.config.fitOffset * Math.max(fitHeightDistance, fitWidthDistance);


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

    load(modeURL,cb) {
        let that = this;

        this.gltfLoader.load(modeURL, (model)=> {

            if(that.shouldBeCentered(model.scene.children)){
                model.scene.children[0].position.set(0,0,0);
                let h = that.getImportedObjectSize(model.scene);
                let heightOffset = h/2;
                model.scene.position.set(0,heightOffset,0);            
                that.centerMeshInScene(model.scene);                
            };
          
            that.scene.add(model.scene);         
            model.scene.updateMatrixWorld(true);
            that.nftMesh = model.scene;
            that.fitCameraToMesh(model.scene);

            that.parentDivEl.children[0].setAttribute('style','display:none;');
            that.renderer.domElement.setAttribute('style','display:inline-block;');
            if(cb){cb()};
        })
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

    updateUI = (el, modelUrl) => {

        let linkCtr = this.config.linkCtrCls;
        let linkView3D = this.createLinkView3D();
        this.addClickListener3D(el, linkView3D, modelUrl);

        let linkViewFull = this.createLinkFullScreen()
        this.addClickListenerFullScreen(el, linkViewFull, modelUrl);

        let linkViewVR = this.createLinkVR()
        this.addClickListenerVR(el, linkViewVR, modelUrl)

        var viewerEl = el;
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
        let targetEl = this.findElFrom(this.config.previewCtrCls, ctr);
        console.log('targetEl');

        console.log(targetEl);
        //console.log('adding listener for '+modelUrl);
        el.addEventListener("click", (e)=>{
            e.preventDefault();
            e.stopPropagation();
            that.updateLink(el,'Loading..');
            that.initContainer(targetEl);
            that.load(modelUrl, function(){
                el.setAttribute('style','display:none;');
                el.parentNode.getElementsByClassName('view-fullscreen-btn')[0].setAttribute('style','display:inline-block;');
                el.parentNode.getElementsByClassName('view-vr-btn')[0].setAttribute('style','display:inline-block;');
                that.addFloor();
                that.showOverlay();
                that.initVR();

                that.animate();

            });         
        });     
    }

    initVR = () =>{
        
        VRButton.registerSessionGrantedListener();        
        
        let vrButtonEl = VRButton.createButton(this.renderer);

            this.vrControls = new VRControls({scene:this.scene, renderer: this.renderer, camera: this.camera});
            this.controllers = this.vrControls.buildControllers();        
    }

    addFloor = () =>{

        const geometry = new THREE.PlaneGeometry( 20, 20  );
        geometry.rotateX(-Math.PI * 0.5);
        let texture = new THREE.TextureLoader().load('images/textures/asphalt.jpg' );
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set( 10, 10 );
        const material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map:texture } );
        this.floorPlane = new THREE.Mesh( geometry, material );
        this.scene.add( this.floorPlane );           

    }

    removeFloor = () =>{
        this.scene.remove( this.floorPlane );
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
            let url = '/'+this.config.nftsRoute+'/'+nftPostHash;
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
}

export {D3DNFTViewer, D3DNFTViewerOverlay};