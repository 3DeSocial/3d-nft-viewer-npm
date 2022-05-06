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

    addAnimationStopListener = () =>{
        if(this.loadedItem){
            if(this.loadedItem.mixer){
                 this.loadedItem.mixer.addEventListener('finish',(e)=>{
                   console.log('animation finish');
                }, false);
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
                                    rotate: that.getRotateFromUI()});
        }, false);        
      
    }

    getFramesFromUI = ()=>{
        return document.getElementById('frames').value;
    }

    getRotateFromUI = ()=>{
        let rotate = document.getElementById('gif-rotate').checked;
        console.log('getRotateFromUI: ',rotate);
        return rotate;
    }

    takeScreenShot = (opts) =>{

        if(typeof(this.screenShots)==='undefined'){
            this.screenShots = [];
        };

        try {
            var strMime = 'image/jpeg';
            const imgData = this.renderer.domElement.toDataURL(strMime);
            console.log(opts);
            if(opts.appendTo){
                console.log('appending');
                this.appendScreenShotToContainer(imgData, opts.appendTo);
            };

            if(opts.replacePreview){
                this.replacePreviewWithScreenShot(imgData, opts.replacePreview);
            }


            this.storeScreenshot(
                imgData.replace(strMime, 'image/octet-stream'),
                imgData,
                'snapshot.jpg'
            );
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
        console.log('appendScreenShotToContainer:', target);
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
                    gifWidth: that.gifWidth,
                    gifHeight: this.gifHeight
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

            if(!isNaN(scaleHeight)){
                console.log('scaling height to: ',scaleHeight);
                if (this.gifHeight > scaleHeight) {
                    // calculate dimensions if we reize to 600 height
                    let reductionPercentage = (scaleHeight / this.gifHeight) * 100;
                    var newWidth = this.gifWidth * (reductionPercentage / 100);
                    this.gifHeight = scaleHeight;
                    this.gifWidth = newWidth;
                }                
            } else {
                console.log('scaling width to: ',scaleWidth);

                if (this.gifWidth > scaleWidth) {
                    // calculate dimensions if we reize to 600 height
                    let reductionPercentage = (scaleWidth / this.gifWidth) * 100;
                    var newHeight = this.gifHeight * (reductionPercentage / 100);
                    this.gifWidth = scaleWidth;
                    this.gifHeight = newHeight;
                }  
            }

            
        }

    getCanvas = () =>{
        let canvasSearch = document.getElementsByTagName('canvas');
        if(!canvasSearch.length){
            return false;
        };

        if(canvasSearch[0]){
            return canvasSearch[0];
        }
        return false;
    }

    takeGifScreenShots = (opts) =>{

            let frames = opts.frames;
            let rotate = opts.rotate;

            let i = 0;
            let previewEl = document.getElementById('asset-previews');

            let gifName = this.generateGifName();
            let that = this;
            this.gifShots = [];
            this.gifWidth = document.getElementsByTagName('canvas')[0].width;
            this.gifHeight = document.getElementsByTagName('canvas')[0].height;
            let cameraDistance = this.camera.position.distanceTo(this.loadedItem.getPosition());
            console.log('cameraDistance: ',cameraDistance);
            let timer = window.setInterval(() => {
                if(opts.rotate===true){
                    const angle = (Math.PI / 18) * i;
                    that.camera.position.x = Math.sin(angle) * cameraDistance;
                    that.camera.position.z = Math.cos(angle) * cameraDistance;
                    that.controls.update();
                }
                if (i === 37) {
                    // 37 as we skip the 1st screenshot
                    clearInterval(timer);
                    
                  console.log('screenShots taken for gif');
                  that.createGifFromImages(gifName);
                } else {
                    if (i > 0) {
                        // dont use first frame which has wrong angle
                        
                        let previewImgTag = document.getElementById(gifName);
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

                ++i;
            }, 100);
              
    }

    generateGifName = () =>{
        let previewEl = document.getElementById('asset-previews');
        let index = previewEl.children.length;
        let gifName = 'gif-'+String(index);
        return gifName;
    }

}
export {D3DAssetCreator}