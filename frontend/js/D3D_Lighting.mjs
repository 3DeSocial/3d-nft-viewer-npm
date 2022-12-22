import * as THREE from 'three';

export default class Lighting {

    constructor(config) {

 		let defaults = {
 			createListeners: true,
            scene: null
        };
    
        this.config = {
            ...defaults,
            ...config
        };

    	if(this.config.scene===null){
    		throw('D3D Lighting: No Scene available');
    	};
    	
    	this.scene = this.config.scene;

        this.initLights();
        if(this.config.createListeners){
     	   this.addListeners();
    	}

    }

    addListeners = () =>{

    	this.addEventListenerAmbient();
    	this.addEventListenersDirectional();
    }

    addEventListenerAmbient = () =>{
    	let that = this;
    	let input = document.body.querySelector('input[name="ambient"]');
    	
    	if(!input){
    		return false;
    	};

    	input.addEventListener('change',(e)=>{
    		let val = e.target.value;
    		that.setIntensity('ambient',val);
    	}, false);
    }

    addEventListenersDirectional = () =>{


    	var that = this;
        this.dLights = Object.keys(this.dLighting);   	
    	this.dLights.forEach((key, index) => {
    		that.addEventListenerDirectional(key);
    	});

    }

    addEventListenerDirectional = (lightName) =>{
    	
    	let that = this;
    	let input = document.body.querySelector('input[name="'+lightName+'"]');
    	
    	if(!input){
    		return false;
    	};

    	let light = this.dLighting[lightName];
    	input.addEventListener('change',(e)=>{
    		let val = e.target.value;
    		that.setIntensity(lightName, val);
    	}, false);

    }


    initLights = () =>{
        //Add lights
        this.aLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.aLight);

        this.dLighting = [];

        const aboveLight = new THREE.DirectionalLight(0xffffff, 0.75);
        aboveLight.castShadow = true;
        aboveLight.position.set(0, 15, 0);
        this.scene.add(aboveLight);
        this.dLighting['above'] = aboveLight;

        const belowLight = new THREE.DirectionalLight(0xffffff, 0);
        belowLight.castShadow = true;
        belowLight.position.set(0, -15, 0);
        this.scene.add(belowLight);
        this.dLighting['below'] = belowLight;

        const leftLight = new THREE.DirectionalLight(0xffffff, 0);
        this.configureLight(leftLight);

        leftLight.position.set(-15, 6, 0);
        this.scene.add(leftLight);
        this.dLighting['left'] = leftLight;

        const rightLight = new THREE.DirectionalLight(0xffffff, 0);
        this.configureLight(rightLight);

        rightLight.position.set(15, 6, 0);
        this.scene.add(rightLight);
        this.dLighting['right'] = rightLight;

        const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.configureLight(frontLight);

        frontLight.position.set(0, 6, -15,);
        this.scene.add(frontLight);
        this.dLighting['front'] = frontLight;

        const backLight = new THREE.DirectionalLight(0xffffff, 0.1);
        this.configureLight(backLight);

        backLight.position.set(0, 6, 15);
        this.scene.add(backLight);
        this.dLighting['back'] = backLight;

    }

    switchOffDirectional = () =>{
        this.dLighting.forEach((light)=>{
            light.intensity = 0;
        })
    }

    switchOnDirectional = () =>{
        let that = this;
        this.config.dLights.forEach((light)=>{
            that.dLighting[light.name].intensity = light.intensity;
            console.log('set ',light.name,' to ',light.intensity)
        })
    }    
    initLightsForConfig = () =>{
        //Add lights
        if(this.confg.lights.aLight){
            this.aLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(this.aLight);
        }        
    }

    configureLight = (light) =>{
   /*     light.castShadow = true;
        light.shadow.camera.top = 200;
        light.shadow.camera.bottom = -200;
        light.shadow.camera.left = - 200;
        light.shadow.camera.right = 200;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500;*/
    }
    setDirectionAll(pos){
    	var that = this;
        this.dLights = Object.keys(this.dLighting);   	
    	this.dLights.forEach((key, index) => {
    		that.dLighting[key].lookAt(pos);
    	});
    }

    setIntensity(lightName, val){
    	
    	if(lightName==='ambient'){
    		this.setIntensityAmb(val);
    	} else {
    		this.setIntensityDLight(lightName, val);
    	};
    }
    setIntensityAmb(val){
    	this.aLight.intensity = val;
    }

    setIntensityDLight(lightName, val){
    	this.dLighting[lightName].intensity = val;
    }    
}

export {Lighting}