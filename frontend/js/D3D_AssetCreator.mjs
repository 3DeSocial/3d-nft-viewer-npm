export const name = 'd3dntfviewer';
import * as THREE from 'three';
import D3DNFTViewer from './3dviewer.js';
import gifshot from 'gifshot';

class D3DAssetCreator extends D3DNFTViewer {

    constructor(config) {
        super(config);
        this.initContainer(this.config.el);
        this.start3D();
        this.addButtonListeners();        
    }

    loadModel = (path, format)=>{
        this.format = format;
        this.setFormat(format);
        let itemToEdit = this.initItemForModel(path, format);
        let centerPos = new THREE.Vector3(0,-5,0);
            itemToEdit.place(centerPos);
        return itemToEdit;

    }

    addButtonListeners = ()=>{
        this.addScreenShotListener();
        this.addGifShotListener();
        this.addMeshLoadedListener();
    }   

    addAnimationStopListener = (timer) =>{
        let that = this;
        if(this.loadedItem){
            if(this.loadedItem.mixer){
                 this.loadedItem.mixer.addEventListener('finish',(e)=>{
                 console.log('animation finish');

                    if(that.recordingTimer){
                        clearInterval(that.recordingTimer);
                        console.log('recordingTimer stopped.');
                    } else {
                        console.log('recordingTimer does not exist');
                    };
                }, false);

                console.log('animation finish listener added');
                console.log(that.recordingTimer);
                console.log(this.recordingTimer);

            }
        }
    } 

    addScreenShotListener = ()=>{
        let that = this;
        
        let btn = document.body.querySelector('button#take-screenshot');
        
        if(!btn){
            return false;
        };

        btn.addEventListener('click',(e)=>{
            let previewEl = document.getElementById('asset-previews');
            that.takeScreenShot({appendTo:previewEl});
        }, false);
    }

    addMeshLoadedListener = ()=>{
         document.body.addEventListener('loaded',(e)=>{
            console.log('loaded mesh!');
            this.refreshAnimationOptions(e.detail.mesh);
            this.resizeCanvas();
        }, false);
    }

    refreshAnimationOptions = (mesh) =>{
        let that = this;
        if(!this.loadedItem.hasAnimations()){
            console.log('Item has no animations');
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
                        that.loadedItem.startAnimation(idx);
                        that.addAnimationStopListener();

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
        
        let btn = document.body.querySelector('button#take-gif');
        
        if(!btn){
            return false;
        };

        btn.addEventListener('click',(e)=>{
            console.log('take gif clicked');
            that.takeGifScreenShots({frames: that.getFramesFromUI(),
                                    rotate: that.getRotateFromUI(),
                                    animType:that.getAnimTypeFromUI()});
        }, false);        
      
    }

    getFramesFromUI = ()=>{
        let frames = parseInt(document.getElementById('frames').value);
        return frames;
    }

    getRotateFromUI = ()=>{
        let rotate = document.getElementById('gif-rotate').checked;
        return rotate;
    }

    getAnimTypeFromUI = () =>{
        let animType = document.getElementById('animation-type').value;
        console.log('animType',animType);
        return animType;
    }
    

    takeScreenShot = (opts) =>{

        if(typeof(this.screenShots)==='undefined'){
            this.screenShots = [];
        };

        //set output height and width
        this.setScalingOptions();

        try {
            var strMime = 'image/jpeg';
            const imgData = this.renderer.domElement.toDataURL(strMime);
            this.scaleImg(imgData, strMime).then((scaledImg)=>{
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
            if(opts.appendTo){
                this.appendScreenShotToContainer(imgData, opts.appendTo, opts.gifName);
            };

            if(opts.replacePreview){               
                this.replacePreviewWithScreenShot(imgData, opts.replacePreview);
            };


            return imgData;
        } catch (e) {
            console.log(e);
            return;
        };

      
    }
    appendGifShotToContainer = (imgData, target, name) =>{
        console.log('appendGifShotToContainer:', target);
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

        createGifFromImages = (gifName) => {
            var that = this;
            let previewImgTag = document.getElementById(gifName);
            this.setScalingOptions();

            gifshot.createGIF(
                {
                    images: that.gifShots,
                    gifWidth: that.outputWidth,
                    gifHeight: this.outputHeight
                },
                function (obj) {
                    if (!obj.error) {
                        var image = obj.image;
                        that.replacePreviewWithScreenShot(image, previewImgTag);
                    };
                }
            );
        }

        setScalingOptions = () =>{
            let heightInput = document.querySelector('input[name="height"]');
            let widthInput = document.querySelector('input[name="width"]');    


            let scaleHeight = parseInt(heightInput.value);
            let scaleWidth = parseInt(widthInput.value);

            let currentWidth = document.getElementsByTagName('canvas')[0].width;
            let currentHeight = document.getElementsByTagName('canvas')[0].height;
            
            if(!isNaN(scaleHeight)){
                console.log('scaling height to: ',scaleHeight);
                if (currentWidth > scaleHeight) {
                    // calculate dimensions if we reize to 600 height
                    let reductionPercentage = (scaleHeight / currentHeight) * 100;
                    var newWidth = currentWidth * (reductionPercentage / 100);
                    this.outputHeight = scaleHeight;
                    this.outputWidth = newWidth;
                } else {
                    this.outputHeight = currentHeight;
                    this.outputWidth = currentWidth;                 
                }
            
            } else {
                console.log('scaling width to: ',scaleWidth);

                if (currentWidth > scaleWidth) {
                    // calculate dimensions if we reize to 600 height
                    let reductionPercentage = (scaleWidth / currentWidth) * 100;
                    var newHeight = currentHeight * (reductionPercentage / 100);
                    this.outputWidth = scaleWidth;
                    this.outputHeight = newHeight;
                } else {
                    this.outputHeight = currentHeight;
                    this.outputWidth = currentWidth;                 
                }


            }

        }

        scaleImg = (imgData, strMime) =>{
            let that = this;
            return new Promise(( resolve, reject ) => {
                var img = new Image;
                    img.src = imgData;
                    img.onload = () =>{

                        // Dynamically create a canvas element of target size
                        var canvas = document.createElement('canvas');
                        canvas.width = that.outputWidth;
                        canvas.height = that.outputHeight;

                        //draw captured screenshot at desired scale
                        var ctx = canvas.getContext("2d");
                            ctx.drawImage(img, 0, 0, that.outputWidth, that.outputHeight);

                        let capture = canvas.toDataURL(strMime);
                        resolve(capture);
                    };
            });

        }

        getCanvas = () =>{
            let canvasSearch = document.querySelector('canvas');
            if(!canvasSearch){
                return false;
            };

            return canvasSearch;
        }

        takeGifScreenShots = (opts) =>{

            let frames = opts.frames;
            let rotate = opts.rotate;
            let animType = opts.animType;
            let i = 0;
            let previewEl = document.getElementById('asset-previews');

            let gifName = this.generateGifName();
            let that = this;

            this.gifShots = [];
            this.outputWidth = document.getElementsByTagName('canvas')[0].width;
            this.outputHeight = document.getElementsByTagName('canvas')[0].height;

            let cameraDistance = this.camera.position.distanceTo(this.loadedItem.getPosition());
            let previewImgTag = document.getElementById(gifName);
            console.log('animType: ',animType);
            if(animType==='animation'){
                this.loadedItem.startCurrentAnimation();
            };
            let recordingTimer = window.setInterval(() => {
                if(opts.rotate===true){
                    that.rotatePreview(i, frames, cameraDistance);
                };
                switch(animType){
                    case 'animation':
                        if(i===0){
                            that.loadedItem.mixer.addEventListener('finish',(e)=>{
                                 console.log('animation finish');

                                    if(recordingTimer){
                                        clearInterval(recordingTimer);
                                        console.log('recordingTimer stopped.');
                                    } else {
                                        console.log('recordingTimer does not exist');
                                    };
                                }, false);
                            console.log('stop event added for ',recordingTimer);
                        };
                        //record as many frames as needed until the anmiation completes
                        let imgData = that.takeGifShot({replacePreview:previewImgTag});
                        var strMime = 'image/jpeg';
                        this.storeGifScreenshot(
                            imgData.replace(strMime, 'image/octet-stream'),
                            imgData,
                            'snapshot.jpg'
                        );
                    break;
                    case 'frames':
                        // record only x frames
                        if (i === frames) {
                            // 37 as we skip the 1st screenshot
                            clearInterval(that.recordingTimer);
                            that.createGifFromImages(gifName);
                        } else {
                            if (i > 0) {
                                // dont use first frame which has wrong angle
                                
                                
                                let imgData = that.takeGifShot({replacePreview:previewImgTag});
                                var strMime = 'image/jpeg';
                                this.storeGifScreenshot(
                                    imgData.replace(strMime, 'image/octet-stream'),
                                    imgData,
                                    'snapshot.jpg'
                                );                        
                            } else {
                                let gifShot = that.takeGifShot({appendTo:previewEl,
                                                                gifName:gifName});

                            }
                        }                        
                    break;
                }
               

                ++i;
            }, 100);
              
    }

    rotatePreview = (i, frames, cameraDistance) =>{

        const angle = ((2*Math.PI) / frames) * i;
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