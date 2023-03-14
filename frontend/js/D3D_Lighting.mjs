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

        this.initLightsForConfig();
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
        this.lights = Object.keys(this.dLighting);      
        this.lights.forEach((key, index) => {
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

    initLightsForConfig = () =>{
        let that = this;
        this.dLighting = [];
        if(!this.config.lights){
            console.log('no lighting config available!');
            return false;
        };
        this.config.lights.forEach((light)=>{
            that.dLighting[light.name] = light;
            switch(light.name){
                case 'ambient':
                    that.dLighting[light.name].light =  new THREE.AmbientLight(0xffffff, light.intensity);
                    this.scene.add(that.dLighting[light.name].light);
                break;
                case 'above':
                    that.dLighting[light.name].light =  new THREE.DirectionalLight(0xffffff, light.intensity);
                    that.dLighting[light.name].light.castShadow = true;
                    that.dLighting[light.name].light.position.set(0, 40, 0);
                    this.scene.add(that.dLighting[light.name].light);
                 break;
                case 'below':
                    that.dLighting[light.name].light =  new THREE.DirectionalLight(0xffffff, light.intensity);
                    that.dLighting[light.name].light.castShadow = true;
                    that.dLighting[light.name].light.position.set(0, 40, 0);
                    this.scene.add(that.dLighting[light.name].light);
                break;
                case 'left':
                    that.dLighting[light.name].light =  new THREE.DirectionalLight(0xffffff, light.intensity);
                    that.dLighting[light.name].light.castShadow = true;
                    that.dLighting[light.name].light.position.set(-40, 0, 0);
                    this.scene.add(that.dLighting[light.name].light);
                break;
                case 'right':
                    that.dLighting[light.name].light =  new THREE.DirectionalLight(0xffffff, light.intensity);
                    that.dLighting[light.name].light.castShadow = true;
                    that.dLighting[light.name].light.position.set(40, 0, 0);
                    this.scene.add(that.dLighting[light.name].light);
                break;
                case 'front':
                    that.dLighting[light.name].light =  new THREE.DirectionalLight(0xffffff, light.intensity);
                    that.dLighting[light.name].light.castShadow = true;
                    that.dLighting[light.name].light.position.set(0, 0, -40);
                    this.scene.add(that.dLighting[light.name].light);
                break;
                case 'back':
                    that.dLighting[light.name].light =  new THREE.DirectionalLight(0xffffff, light.intensity);
                    that.dLighting[light.name].light.castShadow = true;
                    that.dLighting[light.name].light.position.set(0, 0, 40);
                    this.scene.add(that.dLighting[light.name].light);
                break;
            }
        }) 
    }

    initLights = () =>{
        //Add lights
        this.aLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.aLight);

        this.dLighting = [];

     /*   const aboveLight = new THREE.DirectionalLight(0xffffff, 0.75);
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
*/
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.configureLight(frontLight);

        frontLight.position.set(0, 6, -15,);
        this.scene.add(frontLight);
        this.dLighting['front'] = frontLight;

    /*    const backLight = new THREE.DirectionalLight(0xffffff, 0.1);
        this.configureLight(backLight);

        backLight.position.set(0, 6, 15);
        this.scene.add(backLight);
        this.dLighting['back'] = backLight;
*/
    }

    switchOffDirectional = () =>{
        this.dLighting.forEach((light)=>{
            light.intensity = 0;
        })
    }

    switchOnDirectional = () =>{
        let that = this;
        this.config.lights.forEach((light)=>{
            that.dLighting[light.name].intensity = light.intensity;
            console.log('set ',light.name,' to ',light.intensity)
        })
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
        this.lights = Object.keys(this.dLighting);      
        this.lights.forEach((key, index) => {
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
        this.dLighting['ambient'].intensity = val;
    }

    setIntensityDLight(lightName, val){
        this.dLighting[lightName].intensity = val;
    }    
}

export {Lighting}