export const name = 'd3dntfviewer';
let THREE, GLTFLoader, OrbitControls, XRControllerModelFactory, VRButton;

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
                    nftsRoute: 'nfts', // Back end route to initialize NFTs
                    modelsRoute: 'models'// Back end route to load models
                };
        
        this.config = {
            ...defaults,
            ...config
        };
        THREE = this.config.three;
        GLTFLoader = this.config.GLTFLoader;
        OrbitControls = this.config.OrbitControls;
        XRControllerModelFactory = this.config.XRControllerModelFactory;
        VRButton = this.config.VRButton;

        this.isFullScreen = false;
        this.floorPlane = null;
        this.cameraVector = new THREE.Vector3();
        this.dolly = null,
        this.prevGamePads = new Map(),
        this.speedFactor = [0.1, 0.1, 0.1, 0.1],
        this.controllers = []

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
            console.log('exit full screen');
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
        } else {
        }
        // this.render();
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

        isIterable = (obj) =>{
            // checks for null and undefined
            if (obj == null) {
                return false;
            }
            return typeof obj[Symbol.iterator] === 'function';
        }
        
        animate = () =>{
            console.log('animate');
            console.log('isPresenting: ' + this.renderer.xr.isPresenting);
            this.renderer.setAnimationLoop(this.render);

            //    this.renderer.render(this.scene, this.camera);
            //requestAnimationFrame(this.animate);
        }
        
        render = () =>{
            if (this.renderer.xr.isPresenting === true) {
                this.dollyMove();
            };
            this.renderer.render(this.scene, this.camera);
        }

        dollyMove = () =>{
            var handedness = 'unknown';
            var self = this;
            //determine if we are in an xr session
            const session = this.renderer.xr.getSession();

            if (session) {
                var i = 0;
                let xrCamera = this.renderer.xr.getCamera(this.camera);
                if (!xrCamera) {
                    return;
                }
                xrCamera.getWorldDirection(self.cameraVector);

                //a check to prevent console errors if only one input source
                if (this.isIterable(session.inputSources)) {
                    for (const source of session.inputSources) {
                        if (source && source.handedness) {
                            handedness = source.handedness; //left or right controllers
                        }
                        if (!source.gamepad) continue;
                        const controller = this.renderer.xr.getController(i++);
                        const old = this.prevGamePads.get(source);
                        const data = {
                            handedness: handedness,
                            buttons: source.gamepad.buttons.map((b) => b.value),
                            axes: source.gamepad.axes.slice(0)
                        };

                        if (old) {
                            data.buttons.forEach((value, i) => {
                                //handlers for buttons
                                if (value !== old.buttons[i] || Math.abs(value) > 0.8) {
                                    //check if it is 'all the way pushed'
                                    if (value === 1) {
                                        //console.log("Button" + i + "Down");
                                        if (data.handedness == 'left') {
                                            //console.log("Left Paddle Down");
                                            if (i == 1) {
                                                self.dolly.rotateY(-THREE.Math.degToRad(1));
                                            }
                                            if (i == 3) {
                                                //reset teleport to home position
                                                self.dolly.position.x = 0;
                                                self.dolly.position.y = 5;
                                                self.dolly.position.z = 0;
                                            }
                                        } else {
                                            //console.log("Right Paddle Down");
                                            if (i == 1) {
                                                self.dolly.rotateY(THREE.Math.degToRad(1));
                                            }
                                        }
                                    } else {
                                        // console.log("Button" + i + "Up");

                                        if (i == 1) {
                                            //use the paddle buttons to rotate
                                            if (data.handedness == 'left') {
                                                //console.log("Left Paddle Down");
                                                self.dolly.rotateY(
                                                    -THREE.Math.degToRad(Math.abs(value))
                                                );
                                            } else {
                                                //console.log("Right Paddle Down");
                                                self.dolly.rotateY(
                                                    THREE.Math.degToRad(Math.abs(value))
                                                );
                                            }
                                        }
                                    }
                                }
                            });
                            data.axes.forEach((value, i) => {
                                //handlers for thumbsticks
                                // console.log('axes: ',i);
                                //if thumbstick axis has moved beyond the minimum threshold from center, windows mixed reality seems to wander up to about .17 with no input
                                if (Math.abs(value) > 0.1) {
                                    //set the speedFactor per axis, with acceleration when holding above threshold, up to a max speed
                                    self.speedFactor[i] > 1
                                        ? (self.speedFactor[i] = 1)
                                        : (self.speedFactor[i] *= 1.001);
                                    //  console.log(value, self.speedFactor[i], i);
                                    if (i == 2) {
                                        //   console.log('data.handedness: '+data.handedness);
                                        //left and right axis on thumbsticks
                                        if (data.handedness == 'left') {
                                            //   (data.axes[2] > 0) ? console.log('left on left thumbstick') : console.log('right on left thumbstick')

                                            //move our dolly
                                            //we reverse the vectors 90degrees so we can do straffing side to side movement
                                            self.dolly.position.x -=
                                                self.cameraVector.z *
                                                self.speedFactor[i] *
                                                data.axes[2];
                                            self.dolly.position.z +=
                                                self.cameraVector.x *
                                                self.speedFactor[i] *
                                                data.axes[2];

                                            //provide haptic feedback if available in browser
                                            /*  if (
                                        source.gamepad.hapticActuators &&
                                        source.gamepad.hapticActuators[0]
                                    ) {
                                        var pulseStrength = Math.abs(data.axes[2]) + Math.abs(data.axes[3]);
                                        if (pulseStrength > 0.75) {
                                            pulseStrength = 0.75;
                                        }

                                        var didPulse = source.gamepad.hapticActuators[0].pulse(
                                            pulseStrength,
                                            100
                                        );
                                    }*/
                                        } else {
                                            //    console.log('RH ata.axes[2]: '+data.axes[2]);
                                            //    (data.axes[2] > 0) ? console.log('left on right thumbstick') : console.log('right on right thumbstick'); // !!!THIS WORKS!!!
                                            self.dolly.rotateY(-THREE.Math.degToRad(data.axes[2]));
                                        }
                                        // self.controls.update();
                                    }

                                    if (i == 3) {
                                        //up and down axis on thumbsticks
                                        if (data.handedness == 'left') {
                                            // (data.axes[3] > 0) ? console.log('up on left thumbstick') : console.log('down on left thumbstick')
                                            self.dolly.position.y -= self.speedFactor[i] * data.axes[3];
                                            //provide haptic feedback if available in browser
                                            /*  if (
                                        source.gamepad.hapticActuators &&
                                        source.gamepad.hapticActuators[0]
                                    ) {
                                        var pulseStrength = Math.abs(data.axes[3]);
                                        if (pulseStrength > 0.75) {
                                            pulseStrength = 0.75;
                                        }
                                        var didPulse = source.gamepad.hapticActuators[0].pulse(
                                            pulseStrength,
                                            100
                                        );
                                    }*/
                                        } else {
                                            // (data.axes[3] > 0) ? console.log('up on right thumbstick') : console.log('down on right thumbstick')
                                            self.dolly.position.x -=
                                                self.cameraVector.x *
                                                self.speedFactor[i] *
                                                data.axes[3];
                                            self.dolly.position.z -=
                                                self.cameraVector.z *
                                                self.speedFactor[i] *
                                                data.axes[3];

                                            //provide haptic feedback if available in browser
                                            /*    if (
                                        source.gamepad.hapticActuators &&
                                        source.gamepad.hapticActuators[0]
                                    ) {
                                        var pulseStrength = Math.abs(data.axes[2]) + Math.abs(data.axes[3]);
                                        if (pulseStrength > 0.75) {
                                            pulseStrength = 0.75;
                                        }
                                        var didPulse = source.gamepad.hapticActuators[0].pulse(
                                            pulseStrength,
                                            100
                                        );
                                    }*/
                                            //self.controls.update();
                                        }
                                    }
                                } else {
                                    //axis below threshold - reset the speedFactor if it is greater than zero  or 0.025 but below our threshold
                                    if (Math.abs(value) > 0.025) {
                                        self.speedFactor[i] = 0.025;
                                    }
                                }
                            });
                        }
                        this.prevGamePads.set(source, data);
                    }
                }
            }
        }

     fitCameraToMesh(mesh, fitOffset = 0.75) {

        const box = new THREE.Box3().setFromObject(mesh);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const maxSize = Math.max(size.x, size.y, size.z);
        const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * this.camera.fov / 360));
        const fitWidthDistance = fitHeightDistance / this.camera.aspect;
        const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

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

    load(modeURL,cb) {
        let that = this;

        this.gltfLoader.load(modeURL, (model)=> {

            model.scene.updateMatrixWorld(true);
            that.scene.add(model.scene);            
            that.fitCameraToMesh(model.scene);
            that.nftMesh = model.scene;
            that.parentDivEl.children[0].setAttribute('style','display:none;');
            that.renderer.domElement.setAttribute('style','display:inline-block;');
            if(cb){cb()};
        })


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
                VRButton.registerSessionGrantedListener();        
                let vrButtonEl = VRButton.createButton(that.renderer);
                that.controllers = that.buildControllers();
                that.animate();

            });         
        });     
    }

        buildControllers() {
            // controllers
            let controller1 = this.renderer.xr.getController(0);
            controller1.name = 'left';
            //controller1.addEventListener("selectstart", onSelectStart);
            //controller1.addEventListener("selectend", onSelectEnd);
            this.scene.add(controller1);

            let controller2 = this.renderer.xr.getController(1);
            controller2.name = 'right';
            //controller2.addEventListener("selectstart", onSelectStart);
            //controller2.addEventListener("selectend", onSelectEnd);
            this.scene.add(controller2);

            var controllerModelFactory = new XRControllerModelFactory();

            let controllerGrip1 = this.renderer.xr.getControllerGrip(0);
            controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
            this.scene.add(controllerGrip1);

            let controllerGrip2 = this.renderer.xr.getControllerGrip(1);
            controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
            this.scene.add(controllerGrip2);

            //Raycaster Geometry
            var geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -1)
            ]);

            var line = new THREE.Line(geometry);
            line.name = 'line';
            line.scale.z = 5;

            controller1.add(line.clone());
            controller2.add(line.clone());

            //dolly for camera
            let dolly = new THREE.Group();
            dolly.position.set(0, 0, 0);
            dolly.name = 'dolly';
            this.scene.add(dolly);
            dolly.add(this.camera);
            //add the controls to the dolly also or they will not move with the dolly
            dolly.add(controller1);
            dolly.add(controller2);
            dolly.add(controllerGrip1);
            dolly.add(controllerGrip2);
            this.dolly = dolly;
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