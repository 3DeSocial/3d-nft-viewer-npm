import * as THREE from 'three';

export default class SkyBoxLoader {

    constructor(config){
        let defaults = {
            skyBoxPath: '',
            castShadow: true,
            scene: null
        };
    
        this.config = {
            ...defaults,
            ...config
        };

        this.setScene(this.config.scene);
    }

    getRandomInt (min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getSkyPreviewPath(boxname){
        if(this.config.skyBoxPath===''){
            return false;
        };

        let skybox ='';

        let skyBoxPath = this.config.skyBoxPath+'/'+boxname+'/';

        switch(boxname){
            case 'bluecloud':
                return skyBoxPath+'bluecloud_ft.jpg';
            break;
            case 'yellowcloud':
               return skyBoxPath+'yellowcloud_ft.jpg';
            break;
            case 'browncloud':
                return skyBoxPath+'browncloud_ft.jpg';
            break;
            case 'lightblue':
                return skyBoxPath+'front.png';            
            break;             
            case 'blue':
                return skyBoxPath+'bkg1_front.png';
            break;
        }
        
    }

    loadSkyBox(boxname){
        if(this.config.skyBoxPath===''){
            return false;
        };

        let skybox ='';

        const loader = new THREE.CubeTextureLoader();
        let skyBoxPath = this.config.skyBoxPath+'/'+boxname+'/';

        loader.setPath(skyBoxPath);

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

    setRandomSkyBox = () => {
        let skyBoxNo = this.getRandomInt(this.config.skyBoxList.length-1);
        let skyBox = this.loadSkyBox(this.config.skyBoxList[skyBoxNo]);
        this.scene.background = skyBox; 
    }

    setSkyBox = (skyBoxName) => {
        let skyBox = this.loadSkyBox(skyBoxName);
        this.scene.background = skyBox;     
    }

    setScene = (scene) =>{
        this.scene = scene;
    }

}

export {SkyBoxLoader}