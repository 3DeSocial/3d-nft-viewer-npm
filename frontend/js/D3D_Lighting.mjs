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
    		that.setIntensityAmb(val);
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
    		that.setIntensityDLight(lightName, val);
    	}, false);

    }


    initLights = () =>{
//Add lights
        this.aLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.aLight);

        const aboveLight = new THREE.DirectionalLight(0xffffff, 1);
        aboveLight.position.set(0, 20, 0);
        this.scene.add(aboveLight);

        const belowLight = new THREE.DirectionalLight(0xffffff, 0.5);
        belowLight.position.set(0, -20, 0);
        this.scene.add(belowLight);

        const leftLight = new THREE.DirectionalLight(0xffffff, 0);
        leftLight.position.set(-20, 0, 0);
        this.scene.add(leftLight);

        const rightLight = new THREE.DirectionalLight(0xffffff, 0);
        rightLight.position.set(20, 0, 0);
        this.scene.add(rightLight);

        const frontLight = new THREE.DirectionalLight(0xffffff, 0);
        frontLight.position.set(0, 0, -20,);
        this.scene.add(frontLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0);
        backLight.position.set(0, 0, 20);
        this.scene.add(backLight);

        this.dLighting = {above:aboveLight,
                        below:belowLight,
                        left:leftLight,
                        right:rightLight,
                        front:frontLight,
                        back:backLight};



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
    		this.setIntensityDLight(val);
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