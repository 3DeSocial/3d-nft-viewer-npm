import * as THREE from 'three';

let gifWorker = null;
const frameSpeedFactor = 0.1;

export default class Giffer {

    //interface for deso api based on passed config
    constructor(config){
        let defaults = {
              proxy:'',
              gifWorker: null
        };
    
        this.config = {
            ...defaults,
            ...config
        };

        this.swRegistration = null;
        this.getWorkerReference();
    }

    getWorkerReference = () =>{
      let that = this;
      //console.log('getWorkerReference');
      if(navigator){
        // Get the service worker registration
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then(registration => {
              that.swRegistration  = registration;
              
              navigator.serviceWorker.addEventListener('message', (event) => {

                // event.data contains the data sent from the service worker
                const method = (event.data.method)?event.data.method:null;
                switch(method){
                  case 'fetchGifs':
                    if(event.data.payload.length===0){
                      //console.log('no data returned - no animation')
                    } else {
                      this.initGifs(event.data.payload);

                    }
                  break;
                }
                

              });
              that.loadGifs(this.config.gifs)
            })
            .catch(error => {
              console.error('Failed to get Service Worker registration:', error);
            });
        }
      }
      
    }

    messageServiceWorker = (message)=>{
      //console.log('messageServiceWorker this.swRegistration:',this.swRegistration);
      if (this.swRegistration && this.swRegistration.active) {
        this.swRegistration.active.postMessage(message);
      } else {
        console.error('messageServiceWorker: Service Worker is not active or not registered');
      }
    }

    /*  // Web Worker version
  loadWorker = async () => {
      gifWorker = new Worker(workerURL, { type: "module" });
        gifWorker.onmessage = (event) => {
          //console.log('event: ',event);
          switch(event.data.method){
            case 'startFrameTimer':
              //console.log("startFrameTimer!");
              setInterval(function() {

                this.updateGifs();
              }, 500);
              
            break;
            case 'prepareGifs':
              this.startAnimation(event.data.payload);
              break;
            } 
          
        };    
   }*/
    
   initGifs = async (spriteSheetData) => {
    // spritesheet created and recieved back from worker
    //console.log('giffer: startAnimation, no spritsheets: ',spriteSheetData.length);

    spriteSheetData.forEach((spriteSheet, index) => {
      //console.log('process spritesheet: ',index);
      //console.log(spriteSheet);

      const imageBitmap = spriteSheet.spriteSheet;
//console.log('canvas texture not texture');


     // this.previewSheet(imageBitmap);

//console.log('no repeat');
      const frameCount = spriteSheet.frameCount; 

      let xOffsetFrames = [];
      for (let i = 0; i < frameCount; i++) {
        let xOffset = i / frameCount;
        xOffsetFrames.push(xOffset);
      }

      let gifToUpdate = this.findGif(spriteSheet.postHashHex)
      
    //  gifToUpdate.setSpritesheetCanvas(spritesheetTexture,spritesheetTextureFlipped,spriteSheet.dims );
      gifToUpdate.frames = frames;
      gifToUpdate.frameCount = frameCount;      
      gifToUpdate.gifCount = this.gifCount;
      gifToUpdate.xOffsetFrames = xOffsetFrames;
      gifToUpdate.originalDims = spriteSheet.dims;
      gifToUpdate.imageBitmap = imageBitmap;
      gifToUpdate.initMeshGif(gifToUpdate.meshParams).then((nftImgData)=>{

      let spot = nftImgData.spot;
      let halfHeight = nftImgData.height/2;

          spot.pos.y = spot.pos.y+halfHeight;
          //console.log('no height ajust');

          gifToUpdate.place(spot.pos).then((mesh,pos)=>{
              if(spot.rot){
                mesh.rotateY(spot.rot.y);
            //console.log('no rotation');
              } else {
                if(spot.layoutType){
                  if(spot.layoutType==='circle'){
                    let target = that.center.clone();
                        target.y=mesh.position.y;
                        mesh.lookAt(target);
                    }
                  }
              }
            });
        })
    });
    //console.log('giffer: initGifs complete!');
   }
/*
startAnimation = async (spriteSheetData) => {
  // spritesheet created and recieved back from worker
  //console.log('giffer: startAnimation, no spritsheets: ',spriteSheetData.length);

  spriteSheetData.forEach((spriteSheet, index) => {
    //console.log('process spritesheet: ',index);
    //console.log(spriteSheet);

    const imageBitmap = spriteSheet.spriteSheet;
    this.previewSheet(imageBitmap);
    const spritesheetTexture = new THREE.Texture(imageBitmap);


    const frameCount = spriteSheet.frameCount; 
    //console.log('framecount: ',frameCount);
    let xOffsetFrames = [];
    for (let i = 0; i < frameCount; i++) {
      let xOffset = i / frameCount;
      xOffsetFrames.push(xOffset);
    }

    let gifToUpdate = this.findGif(spriteSheet.postHashHex)
    
    gifToUpdate.setSpritesheetCanvas(spritesheetTexture,spriteSheet.dims );
    gifToUpdate.frames = frames;
    gifToUpdate.frameCount = frameCount;      
    gifToUpdate.gifCount = this.gifCount;
    gifToUpdate.xOffsetFrames = xOffsetFrames;
    //console.log('gifToUpdate',gifToUpdate);


  });
  //console.log('giffer: startAnimation complete!');


}*/
previewSheet = (imageBitmap) =>{
  // Assuming you have an ImageBitmap object named 'imageBitmap'

  // Create a canvas and draw the ImageBitmap to it
  let canvas = document.createElement('canvas');
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  let ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0);

  // Convert the canvas to a data URL
  let dataURL = canvas.toDataURL();
    // Create texture for material
    var texture = THREE.ImageUtils.loadTexture( dataURL );
  // Set the src attribute of the img tag to the data URL
  let img = document.createElement('img'); // Select your img element
  img.src = dataURL;
  document.getElementsByClassName('main-wrapper')[0].appendChild(img);
  //console.log('appended preview')

}
findGif = (postHashHexToFind) =>{
  // Assuming this.gifs[] contains an array of objects with property postHashHex
  const specificObject = this.gifs.find((obj) => obj.config.nft.postHashHex === postHashHexToFind);

  if (specificObject) {
    // The specific object with the matching postHashHex value was found
    return specificObject
  } else {
    // No object with the matching postHashHex value was found
    return false;
    
  }

}

  loadGifs = async (gifs) => {

    let that = this;
    this.gifs =gifs;
    this.gifCount = this.gifs.length;        

    let gifUrls = this.getGifUrls();

    let payload = {method:'fetchGifs',
                    data: gifUrls};

    this.messageServiceWorker(payload);  

  }

  getGifUrls = () =>{
    let gifUrls = [];
    this.gifs.forEach((gifItem, index) => {
    if(gifItem.config.spot){
      let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
      let targetDims = gifItem.config.spot.dims;
      let params = {url:url,
        targetDims:targetDims,
        postHashHex: gifItem.config.nft.postHashHex};
        gifUrls.push(params);
    }

    
    });
    return gifUrls;
  }

      updateGifs = (elapsedTime)=>{
        if(!this.gifs){
          return;
        };
        let gifCount = this.gifs.length;
        this.gifs.forEach((gifItem, index) => {
          
          if(gifItem.mesh){
            if (gifItem.xOffsetFrames) {

              const frames = gifItem.frames;
              const frameCount = gifItem.frameCount;
              const frameIndex = Math.floor(elapsedTime / frameSpeedFactor) % frameCount;
              const xOffset = frameIndex / frameCount;
              // Update the xOffset in the mesh material
              //gifItem.mesh.material[4].map.offset.x = xOffset;
              //gifItem.mesh.material[4].needsUpdate = true;
              // Update the xOffset in the mesh material
              gifItem.mesh.material[5].map.offset.x = xOffset;
              gifItem.mesh.material[5].needsUpdate = true;

            }
          }
      });        
    }

}
export {Giffer}