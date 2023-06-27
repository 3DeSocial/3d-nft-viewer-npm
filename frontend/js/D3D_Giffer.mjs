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
      console.log('getWorkerReference');
      if(navigator){
        // Get the service worker registration
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then(registration => {
              that.swRegistration  = registration;
              
              navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('message recieved from worker: ');
                console.log(event);
                // event.data contains the data sent from the service worker
                const method = (event.data.method)?event.data.method:null;
                switch(method){
                  case 'fetchGifs':
                    console.log('gifs fetched!');
                    console.log(event.data);
                    if(event.data.payload.length===0){
                      console.log('no data returned - no animation')
                    } else {
                      this.initGifs(event.data.payload);

                    }
                  break;
                }
                

              });
              console.log('message listerner set up in giffe0, calling load gifs');
              that.loadGifs(this.config.gifs)
            })
            .catch(error => {
              console.error('Failed to get Service Worker registration:', error);
            });
        } else {
          console.log('sw not in nav');
        }
      } else {
        console.log('navigator not available');
      }
      
    }

    messageServiceWorker = (message)=>{
      console.log('messageServiceWorker this.swRegistration:',this.swRegistration);
      if (this.swRegistration && this.swRegistration.active) {
        this.swRegistration.active.postMessage(message);
      } else {
        console.error('messageServiceWorker: Service Worker is not active or not registered');
      }
    }

    /*
  loadWorker = async () => {
      gifWorker = new Worker(workerURL, { type: "module" });
        gifWorker.onmessage = (event) => {
          console.log('event: ',event);
          switch(event.data.method){
            case 'startFrameTimer':
              console.log("startFrameTimer!");
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
    console.log('giffer: startAnimation, no spritsheets: ',spriteSheetData.length);

    spriteSheetData.forEach((spriteSheet, index) => {
      console.log('process spritesheet: ',index);
      console.log(spriteSheet);

      const imageBitmap = spriteSheet.spriteSheet;

      const spritesheetTexture = new THREE.Texture(imageBitmap);
      spritesheetTexture.repeat.set(1 / spriteSheet.frameCount, 1);
      spritesheetTexture.needsUpdate = true;    

      const frameCount = spriteSheet.frameCount; 
      console.log('framecount: ',frameCount);
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

      gifToUpdate.initMesh(gifToUpdate.meshParams).then((nftImgData)=>{
        let spot = nftImgData.spot;
        let halfHeight = nftImgData.height/2;
            spot.pos.y = spot.pos.y+halfHeight;
            gifToUpdate.place(spot.pos).then((mesh,pos)=>{
              if(spot.rot){
                mesh.rotateY(spot.rot.y);
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
        });
        console.log('giffer: initGifs complete!');
    })
   }

startAnimation = async (spriteSheetData) => {
  // spritesheet created and recieved back from worker
  console.log('giffer: startAnimation, no spritsheets: ',spriteSheetData.length);

  spriteSheetData.forEach((spriteSheet, index) => {
    console.log('process spritesheet: ',index);
    console.log(spriteSheet);

    const imageBitmap = spriteSheet.spriteSheet;

    const spritesheetTexture = new THREE.Texture(imageBitmap);
    spritesheetTexture.repeat.set(1 / spriteSheet.frameCount, 1);
    spritesheetTexture.needsUpdate = true;    

    const frameCount = spriteSheet.frameCount; 
    console.log('framecount: ',frameCount);
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
    console.log('gifToUpdate',gifToUpdate);


  });
  console.log('giffer: startAnimation complete!');


}

findGif = (postHashHexToFind) =>{
  // Assuming this.gifs[] contains an array of objects with property postHashHex
  console.log('findGif: ',postHashHexToFind);
  const specificObject = this.gifs.find((obj) => obj.config.nft.postHashHex === postHashHexToFind);

  if (specificObject) {
    // The specific object with the matching postHashHex value was found
    return specificObject
  } else {
    // No object with the matching postHashHex value was found
    console.log('Object not found: ',postHashHexToFind);

    return false;
    
  }

}

  loadGifs = async (gifs) => {

    let that = this;
    this.gifs =gifs;
    this.gifCount = this.gifs.length;        
    console.log('loadGifs: ',this.gifs.length);

    let gifUrls = this.getGifUrls();

    let payload = {method:'fetchGifs',
                    data: gifUrls};

    console.log('payload: ');
    console.log(payload);
    this.messageServiceWorker(payload);  

  }

  getGifUrls = () =>{
    let gifUrls = [];
    this.gifs.forEach((gifItem, index) => {
      if(gifItem.config.spot){
        let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
        console.log('gifItem config');

        console.log(gifItem.config);
        let targetDims = gifItem.config.spot.dims;
        console.log('targetDims: '+targetDims);
        let params = {url:url,
          targetDims:targetDims,
          postHashHex: gifItem.config.nft.postHashHex};
          console.log(params);
          gifUrls.push(params);
      } else {
        console.log('no spot');
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
              gifItem.mesh.material[4].map.offset.x = xOffset;
              gifItem.mesh.material[4].needsUpdate = true;
              // Update the xOffset in the mesh material
              gifItem.mesh.material[5].map.offset.x = xOffset;
              gifItem.mesh.material[5].needsUpdate = true;

            }
          }
      });        
    }

}
export {Giffer}