export const name = 'd3dntfviewer';
import * as THREE from 'three';
import D3DNFTViewer from './3dviewer.mjs';
import gifshot from 'gifshot';
import record from 'canvas-to-video';

class D3DAssetCreator extends D3DNFTViewer {

    constructor(config) {
        super(config);
        this.initContainer(this.config.el);
        this.start3D();
        if(this.config.useOwnHandlers === false){
            this.addButtonListeners();        
        }
    }

    clearScene = (obj)=>{
        while(obj.children.length > 0){ 
            this.clearScene(obj.children[0])
            obj.remove(obj.children[0]);
        }
        if(obj.geometry) obj.geometry.dispose()

        if(obj.material){ 
            //in case of map, bumpMap, normalMap, envMap ...
            Object.keys(obj.material).forEach(prop => {
            if(!obj.material[prop])
                return         
            if(obj.material[prop] !== null && typeof obj.material[prop].dispose === 'function')                                  
                obj.material[prop].dispose()                                                        
            })
            if(obj.material.dispose){
               obj.material.dispose()
            }
        }
    }   

    addButtonListeners = ()=>{
        this.addClearSceneListener();
        this.addScreenShotListener();
        this.addGifShotListener();
        this.addVideoListener();        
        this.addMeshLoadedListener();
    }   

    addClearSceneListener =()=>{
        let that = this;
        
        let btn = document.body.querySelector('button#clear-scene');
        
        if(!btn){
            return false;
        };

        btn.addEventListener('click',(e)=>{
            that.clearMesh(that.mesh, ()=>{
                console.log('mehs removed');
            });
            this.initContainer(that.config.el);
        }, false);
    }

    addScreenShotListener = ()=>{
        let that = this;
        
        let btn = document.body.querySelector('button#take-screenshot');
        
        if(!btn){
            return false;
        };

        btn.addEventListener('click',(e)=>{
            let previewEl = document.getElementById('asset-previews');
            let opts = that.getTargetSizeFromUI();
                opts.appendTo = previewEl;
            that.captureScreenshot(opts);
        }, false);
    }

    addMeshLoadedListener = ()=>{
         document.body.addEventListener('loaded',(e)=>{
            this.refreshAnimationOptions(e.detail.mesh);
            this.resizeCanvas();
        }, false);
    }

    refreshAnimationOptions = (mesh) =>{
        let that = this;
        if(!this.loadedItem.hasAnimations()){
            return false;
        };

        let animationList = document.body.querySelector('ul#animations');
        this.removeAllChildNodes(animationList);
        this.loadedItem.animations.forEach(function(anim, idx){

            let li = document.createElement('li');
                li.setAttribute('class','anim');
                li.innerHTML = anim.name + ' duration: '+anim.duration;
                li.anim = anim;
                li.addEventListener('click',(el)=>{

                    let lis = animationList.querySelectorAll('li');
                    
                    lis.forEach(function(listItem) {
                        listItem.setAttribute('style','background-color: #FFF;');
                    });                    

                    li.setAttribute('style','background-color: #9F9;');

                    if(that.loadedItem.action === null){
                        that.loadedItem.startAnimation(idx, THREE.LoopRepeat);
                    } else {
                        that.loadedItem.stopAnimation();
                        li.setAttribute('style','background-color: #FFF;');
                    }
                    
                });

                animationList.appendChild(li);

        });

        animationList.setAttribute('style','display: inline-block;');
    }

    removeAllChildNodes = (parent) => {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    addGifShotListener = ()=>{

        let that = this;
        
        let btn = document.body.querySelector('button#take-gif-anim');
        
        if(btn){
            btn.addEventListener('click',(e)=>{
                e.preventDefault();

                let opts = that.getTargetSizeFromUI();
                    opts.animationIndex = that.loadedItem.currentAnimation;
                    opts.previewElement = 'asset-previews';
                    console.log(opts);

                that.captureAnimationGif(opts).then((gif)=>{
                    console.log('Animated Gif Capture Complete.');
                });

            }, false);            
        };
        
        let btn2 = document.body.querySelector('button#take-gif-rot');
        
        if(btn2){
            btn2.addEventListener('click',(e)=>{
                e.preventDefault();

                let opts = that.getTargetSizeFromUI();
                    opts.rotationAngles = that.getFramesFromUI(),
                    opts.rotationDirection = that.getRotateFromUI(),
                    opts.previewElement = 'asset-previews';
                    that.captureRotatingGif(opts).then((gif)=>{
                        console.log('Rotating Gif Capture Complete.');
                    });
            }, false);    
        };
    }

    addVideoListener = (opts) => {
        let that = this;
        let btn = document.body.querySelector('button#take-video');
        if(btn){
            btn.addEventListener('click',(e)=>{
                e.preventDefault();

                const defaults = {
                    // the number of times you want to record per duration
                    timeslice: 100,
                    // the length of video you would like to record
                    duration: 3000,
                    mimeType: 'video/webm',
                    audioBitsPerSecond: 0,
                    videoBitsPerSecond: 25000000,
                    rotationAngles: that.getVideoFramesFromUI(), 
                    rotationDirection: that.getVideoRotateFromUI(),
                    animate: that.getAnimateFromUI(),
                    previewElement: 'asset-previews',
                    duration: that.getDurationFromUI(),
                    timeslice: that.getTimesliceFromUI(),
                };

                let opts = that.getTargetSizeFromUI();

                opts = {...defaults,...opts};

                that.setVideoOptions(opts);
                that.captureVideo(opts).then((video)=>{
                    console.log('Video Capture Complete.');
                })
            })
       }
    }

    createPlayer = (previewElement) =>{
        let player = document.createElement('video');
        let previewEl = document.getElementById(previewElement);
            previewEl.appendChild(player);

        return player;
    }

    getTargetSizeFromUI = ()=>{
        let heightInput = document.querySelector('input[name="height"]');
        let widthInput = document.querySelector('input[name="width"]');    


        let scaleToHeight = parseInt(heightInput.value);
        let scaleToWidth = parseInt(widthInput.value);

        return {scaleToHeight: scaleToHeight, scaleToWidth: scaleToWidth};
    }

    getFramesFromUI = ()=>{
        let angles = parseInt(document.getElementById('angles').value);
        return angles;
    }

    getRotateFromUI = ()=>{

        let rotate = document.querySelector('input[name="rotate-direction"]:checked').value
        return rotate;
    }

    getVideoFramesFromUI = ()=>{
        let angles = parseInt(document.getElementById('video-angles').value);
        return angles;
    }

    getVideoRotateFromUI = ()=>{

        let rotate = document.querySelector('input[name="video-rotate-direction"]:checked').value
        return rotate;
    }

    getAnimateFromUI = ()=>{

        let animate = document.querySelector('input[name="animate"]:checked').value
        return animate;
    }

    getDurationFromUI = ()=>{
        let duration = parseInt(document.getElementById('duration').value);
        return duration;
    }

    getTimesliceFromUI = ()=>{
        let timeslice = parseInt(document.getElementById('timeslice').value);
        return timeslice;
    }  
    captureScreenshot = (opts) =>{

        this.screenShots = [];

        opts = this.validateScaleOptions(opts);
        let outputSize = this.calcOutputSize(opts.scaleToWidth, opts.scaleToHeight);

        try {
            var strMime = 'image/jpeg';
            const imgData = this.renderer.domElement.toDataURL(strMime);
            this.scaleImg(imgData, strMime, outputSize.width, outputSize.height).then((scaledImg)=>{
                if(opts.appendTo){
                    this.appendScreenShotToContainer(scaledImg, opts.appendTo);
                };

                if(opts.replacePreview){
                    this.replacePreviewWithScreenShot(scaledImg, opts.replacePreview);
                }


                this.storeScreenshot(
                    scaledImg.replace(strMime, 'image/octet-stream'),
                    scaledImg,
                    'snapshot.jpg'
                );                
            });
            
        } catch (e) {
            console.log(e);
            return;
        }

      
    }

    storeScreenshot = async (strData, binaryData) =>{
        let file = '';
        let name = '';

        await fetch(binaryData)
            .then((res) => res.blob())
            .then((blob) => {

                    file = new File([blob], 'File name', { type: 'image/jpeg' });
                    name = 'file_' + Date.now() + '.jpeg';
                    this.screenShots.push({
                        src: strData,
                        name: name,
                        fileData: file
                    });
            });
    }

    appendScreenShotToContainer = (imgData, target, name) =>{

        let newEl = document.createElement('img');
            newEl.setAttribute('id',name);
            newEl.src = imgData;

        target.appendChild(newEl);
        return newEl;
    }


    takeGifShot = (opts) =>{
        let imgData = null;
        let gifPreviewImg = null;
        try {
            var strMime = 'image/jpeg';
            imgData = this.renderer.domElement.toDataURL(strMime);
            return imgData;
        } catch (e) {
            console.log(e);
            return;
        };

      
    }

    displayGifShot = (opts)=>{
        if(opts.appendTo){
            this.appendScreenShotToContainer(opts.imgData, opts.appendTo, opts.gifName);
        };

        if(opts.replacePreview){               
            this.replacePreviewWithScreenShot(opts.imgData, opts.replacePreview);
        };
    }


    appendGifShotToContainer = (imgData, target, name) =>{
        let newEl = document.createElement('img');
            newEl.setAttribute('class',name);
            newEl.src = imgData;

        target.appendChild(newEl);
        return newEl;
    }

    replacePreviewWithScreenShot = (imgData, target) =>{
        target.src = imgData;
    }

    storeGifScreenshot = async (strData, binaryData) =>{
        let file = '';
        let name = '';

        await fetch(binaryData)
            .then((res) => res.blob())
            .then((blob) => {

                    file = new File([blob], 'File name', { type: 'image/gif' });
                    name = 'file_' + Date.now() + '.gif';
                    this.gifShots.push({
                        src: strData,
                        name: name,
                        fileData: file
                    });
            });
    }

    createGifFromImages = (gifName, outputWidth, outputHeight) => {
        var that = this;
        return new Promise(( resolve, reject ) => {

            let previewImgTag = document.getElementById(gifName);
            if(that.gifShots.length===0){
                throw('Error: no screenShots taken');
            };

            let params = {
                    images: that.gifShots,
                    gifWidth: outputWidth,
                    gifHeight: outputHeight
                };

            console.log('gif params: ',params);

            gifshot.createGIF(
                params,
                function (obj) {
                    if (!obj.error) {
                        var image = obj.image;
                        that.replacePreviewWithScreenShot(image, previewImgTag);
                        resolve(image);
                    };
                }
            );
        })
    }

    calcOutputSize = (scaleWidth, scaleHeight) =>{

        console.log('calcOutputSize',scaleWidth, scaleHeight);

        let currentWidth = document.getElementsByTagName('canvas')[0].width;
        let currentHeight = document.getElementsByTagName('canvas')[0].height;
        let outputWidth = currentWidth;
        let outputHeight = currentHeight;
        console.log('currentWidth: ',currentWidth);
        console.log('currentHeight: ',currentHeight);
        if(!isNaN(parseInt(scaleHeight))||(parseInt(scaleHeight)===0)){
            if (currentHeight > scaleHeight) {
                // calculate dimensions if we reize to 600 height
                let reductionPercentage = (scaleHeight / currentHeight) * 100;
                var newWidth = currentWidth * (reductionPercentage / 100);
                outputHeight = scaleHeight;
                outputWidth = newWidth;
                console.log('calculate reductionPercentage:',reductionPercentage);
                console.log('this.outputHeight: ',outputHeight);
                console.log('this.outputWidth: ',newWidth);

            } else {
                console.log('currentHeight < scaleHeight: no scaling required.');
                
                // dont scale larger or it will stretch
                outputHeight = currentHeight;
                outputWidth = currentWidth;                 
            }
        
        } else {
            if (currentWidth > scaleWidth) {

                // calculate dimensions if we reize to 600 height
                let reductionPercentage = (scaleWidth / currentWidth) * 100;
                var newHeight = currentHeight * (reductionPercentage / 100);
                outputWidth = scaleWidth;
                outputHeight = newHeight;
                console.log('calculate newHeight:',newHeight);
            } else {
                console.log('currentWidth < scaleWidth: no scaling required.');

                // dont scale larger or it will stretch
                outputHeight = currentHeight;
                outputWidth = currentWidth;                 
            }

        };

        return {width:outputWidth, height: outputHeight};

    }

    scaleImg = (imgData, strMime, outputWidth, outputHeight) =>{
        let that = this;
        return new Promise(( resolve, reject ) => {
            var img = new Image;
                img.src = imgData;
                img.onload = () =>{

                    // Dynamically create a canvas element of target size
                    var canvas = document.createElement('canvas');
                    canvas.width = outputWidth;
                    canvas.height = outputHeight;

                    //draw captured screenshot at desired scale
                    var ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

                    let capture = canvas.toDataURL(strMime);
                    resolve(capture);
                };
        });

    }

    captureAnimationGif = (opts) =>{
        return new Promise(( resolve, reject ) => {

            let that = this;     
            this.gifShots = [];

            let i = 0;
            let previewEl = document.getElementById(opts.previewElement);

            let gifName = this.generateGifName();

            opts = this.validateScaleOptions(opts);
            let outputSize = this.calcOutputSize(opts.scaleToWidth, opts.scaleToHeight);

            let strMime = 'image/jpeg';
                this.loadedItem.startCurrentAnimation();

            let recordingTimer = window.setInterval(() => {
                let imgData = null;


                //if first shot, create and append image tag
                if(i===0){
                    imgData = that.takeGifShot({appendTo:previewEl, gifName: gifName});
                    this.displayGifShot({appendTo:previewEl, gifName: gifName, imgData:imgData})
                };                
                //record other frames but dont displayGifShot until complete
                if(i>0){
                    let previewImgTag = document.getElementById(gifName);
                    imgData = that.takeGifShot({replacePreview:previewImgTag, gifName: gifName});
                };

                //store in array
                this.storeGifScreenshot(
                    imgData.replace(strMime, 'image/octet-stream'),
                    imgData,
                    'snapshot.jpg'
                );

                //if animation stops, stop recording
                if(!this.loadedItem.animRunning){
                    clearInterval(recordingTimer);
                    that.createGifFromImages(gifName, outputSize.width, outputSize.height).then((image)=>{
                        resolve(image)
                    })
                };

                ++i;
            }, 100);
        });
    }

    captureRotatingGif = (opts) =>{
        
        let that = this;

        return new Promise(( resolve, reject ) => {

            let angles = opts.rotationAngles;
            let rotationDirection = opts.rotationDirection;
            let i = 0;
            let previewEl = document.getElementById(opts.previewElement);

            let gifName = this.generateGifName();

            opts = this.validateScaleOptions(opts);
            let outputSize = this.calcOutputSize(opts.scaleToWidth, opts.scaleToHeight);     

            this.gifShots = [];

            let cameraDistance = this.camera.position.distanceTo(this.loadedItem.getPosition());
            let previewImgTag = document.getElementById(gifName);

            let strMime = 'image/jpeg';
            let noRotations = angles+2;

            this.camera.position.x = Math.sin(0) * cameraDistance;
            this.camera.position.z = Math.cos(0) * cameraDistance;

            this.controls.update();

            let recordingTimer = window.setInterval(() => {

                let imgData = null;
                
                //rotate first
                that.rotatePreview(i, angles, cameraDistance, rotationDirection);

                //if first shot, create and append image tag
                if(i===0){

                    imgData = that.takeGifShot({appendTo:previewEl, gifName: gifName});
                    this.displayGifShot({appendTo:previewEl, gifName: gifName, imgData:imgData})
                    this.storeGifScreenshot(
                        imgData.replace(strMime, 'image/octet-stream'),
                        imgData,
                        'snapshot.jpg');
                } else {
                    // dont use first frame which has wrong angle                                
                    let imgData = that.takeGifShot({replacePreview:previewImgTag, gifName: gifName});
                    this.storeGifScreenshot(
                        imgData.replace(strMime, 'image/octet-stream'),
                        imgData,
                        'snapshot.jpg'
                    );

                    // stop when all angles are covered
                    if (i > noRotations) {
                        // 37 as we skip the 1st screenshot
                        clearInterval(recordingTimer);
                        that.createGifFromImages(gifName, outputSize.width, outputSize.height).then((image)=>{
                            resolve(image)
                        });
                    };                   
                }

                ++i;
            }, noRotations);
        }); 
    }

    validateScaleOptions = (opts) =>{
        console.log('validateScaleOptions',opts);
        if(!isNaN(parseInt(opts.scaleToWidth))&&!isNaN(parseInt(opts.scaleToHeight))){
            // we have width and height instead of just one
            if(parseInt(opts.scaleToWidth)>parseInt(opts.scaleToHeight)){
                delete opts.scaleToWidth;
                return opts;
            };

            if (parseInt(opts.scaleToWidth)<parseInt(opts.scaleToHeight)){
                delete opts.scaleToHeight;
                return opts;
            };

           if (parseInt(opts.scaleToWidth) === parseInt(opts.scaleToHeight)){
                delete opts.scaleToWidth;
                return opts;
            };
        } else {
            return opts;
        }
    }

    setVideoOptions = (opts)=>{

        let that = this;
        let angles = opts.rotationAngles;
        let rotationDirection = opts.rotationDirection;
        let i = 0;
        let previewEl = document.getElementById(opts.previewElement);
        let gifName = this.generateGifName();
        let cameraDistance = this.camera.position.distanceTo(this.loadedItem.getPosition());
        let previewImgTag = document.getElementById(gifName);
        opts = this.validateScaleOptions(opts);
        let outputSize = this.calcOutputSize(opts.scaleToWidth, opts.scaleToHeight);

        if(parseInt(opts.animate)>0){
            if(opts.animate===1){
                this.loadedItem.startCurrentAnimation(THREE.LoopOnce);
            } else {
                this.loadedItem.startCurrentAnimation(THREE.LoopRepeat);
            }
        }
        if(rotationDirection>0){
            let rotationTimer = window.setInterval(() => {

                //rotate first
                that.rotatePreview(i, angles, cameraDistance, rotationDirection);

                //if first shot, create and append image tag
                if (i === angles) {
                    // 37 as we skip the 1st screenshot
                    clearInterval(rotationTimer);
                };
                ++i;
            }, 100);
        }
    }

    captureVideo = async (opts) =>{
        return new Promise(( resolve, reject ) => {

            record(this.renderer.domElement, opts).then((video)=>{
                const url = URL.createObjectURL(video);

                let player = this.createPlayer(opts.previewElement);
                    player.src = url;
                    player.controls = true;
                    resolve(url);
            })
            
        });

    }

    rotatePreview = (i, angles, cameraDistance, rotationDirection) =>{
        let angle;
       // console.log('rotatePreview: ', i, angles, cameraDistance, rotationDirection);
        angle = ((2*Math.PI) / angles) * i;
        if(parseInt(rotationDirection)===1){
            angle = -(angle);
        };
       

        this.camera.position.x = Math.sin(angle) * cameraDistance;
        this.camera.position.z = Math.cos(angle) * cameraDistance;
        this.controls.update();
    }

    generateGifName = () =>{
        let previewEl = document.getElementById('asset-previews');
        let index = previewEl.children.length;
        let gifName = 'gif-'+String(index);
        return gifName;
    }

}
export {D3DAssetCreator}