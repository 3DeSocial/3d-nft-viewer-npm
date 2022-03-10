 class Viewer {
    constructor(parentDivEl) {

        //First lets create a parent DIV
        this.parentDivEl = parentDivEl;

        this.parentDivElWidth = this.parentDivEl.children[0].offsetWidth;
        this.parentDivElHeight = this.parentDivEl.children[0].offsetHeight;

        this.parentDivEl.children[0].setAttribute('style','display:none;');
        //Lets create a new Scene
        this.scene = new THREE.Scene();
        
        let skyBoxList = ['blue','bluecloud','browncloud','lightblue','yellowcloud'];
        let skyBoxNo = this.getRandomInt(0,4);
        let skyBox = this.loadSkyBox(skyBoxList[skyBoxNo]);
        this.scene.background = skyBox;
        //Create a camera
        this.camera = new THREE.PerspectiveCamera(60, this.parentDivElWidth/this.parentDivElHeight, 0.01, 1000 );
        //Only gotcha. Set a non zero vector3 as the camera position.
        this.camera.position.set(0,0,0.1);

        //Create a WebGLRenderer
        this.renderer = new THREE.WebGLRenderer({antialias: true,
                alpha: true,
                preserveDrawingBuffer: true});
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);
        this.renderer.setClearColor( 0x000000, 1 );

        this.parentDivEl.appendChild(this.renderer.domElement);

        //Loader GLTF
        this.gltfLoader = new THREE.GLTFLoader();

        //Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

        //Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        //Add dirlights
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(-4,15,10);
        this.scene.add(directionalLight);

        this.onWindowResize();

        this.animate();

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
    onWindowResize() {


        window.addEventListener('resize', () => {
            this.camera.aspect = this.parentDivElWidth/this.parentDivElHeight;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.parentDivElWidth, this.parentDivElHeight);

        })

    }

    animate() {

        requestAnimationFrame(this.animate.bind(this));

        this.renderer.render(this.scene, this.camera);

    }

    createParentDivEl() {
        let parentDivEl = document.createElement('div');
        parentDivEl.id = "viewer3d";
        parentDivEl.classList.add('viewer');
        document.body.appendChild(parentDivEl);
        return parentDivEl;
    }

     fitCameraToMesh(mesh, fitOffset = 1.2) {

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

    load(modeURL) {
        //TODO: Load's external files

        this.gltfLoader.load(modeURL, (model)=> {

            model.scene.updateMatrixWorld(true);

            this.fitCameraToMesh(model.scene);

            this.scene.add(model.scene);
        })


    }
}

 (function() { 

	var camera, controls, scene, renderer;

	var cameraFov = 60;

 	updateUI = (el, modelUrl) => {
		//console.log('showing button for '+modelUrl);
		var a = document.createElement('a');
      	var linkText = document.createTextNode("Click to View in 3D");
			a.appendChild(linkText);
			a.title = "View in 3D";
			a.href = "#";
            a.classList = "btn";
		var viewerEl = el;
			viewerEl.innerHTML ='';
			viewerEl.appendChild(a);
        el.setAttribute('model-status','available');
		return a;			
 	}



 	addClickListener = (el, modelUrl) => {
        let that = this;
		//console.log('adding listener for '+modelUrl);
		el.addEventListener("click", (e)=>{
			e.preventDefault();
			e.stopPropagation();
            let parentLi = el.parentNode.parentNode;
            console.log(parentLi.children);            
           

            let container = parentLi.children[1];
            console.log(container);
  			let appInstance = new Viewer(container);
    			appInstance.load(modelUrl);			
		});		
 	}

 	initModel = (el) => {
 		const that = this;
        let modelStatus = el.getAttribute('model-status');
        if(!modelStatus){
            modelStatus = 'requested';
            el.setAttribute('model-status',modelStatus);
        };
        if(modelStatus!=='available'){
     		let nftPostHash = el.getAttribute('data-nft');
     		let url = '/nfts/'+nftPostHash;
     		fetch(url,{ method: "post"})
     		.then(response => response.json())
     		.then((data)=>{	

     			if(data !== undefined){
     				let fullUrl = '/models/'+nftPostHash+data.modelUrl;
     				let link = this.updateUI(el, fullUrl);
     				this.addClickListener(link, fullUrl);
     			};

     		}).catch(err => {
     			console.log(err);
     			console.log(response);
     		});
        };

 	} 	

    initNFTs = (container)=>{
        if(!container){
            container = document;
        };
    
        let nfts = Array.from(container.getElementsByClassName('nft-viewer'));
        nfts.forEach(this.initModel);        
    }

    this.initNFTs();

 })(this);