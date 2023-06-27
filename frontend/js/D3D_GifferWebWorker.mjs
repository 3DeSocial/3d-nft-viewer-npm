import * as THREE from 'three';
const workerURL = new URL('$lib/gifWorker.js', import.meta.url);
console.log('created worker url: ',workerURL);
let gifWorker = null;
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
      this.loadWorker();
      this.gifs = [];
    }

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
   }
    
   startAnimation = async (spriteSheetData) => {
    // spritesheet created and recieved back from worker

    const a = new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * (1 + spriteSheetData.length * 5));
    const sharedArray = new Float64Array(sharedBuffer);

    let frameSetLengths = [];
    spriteSheetData.forEach((spriteSheet, index) => {

    const imageBitmap = spriteSheet.spriteSheet;

    const spritesheetTexture = new THREE.Texture(imageBitmap);
    spritesheetTexture.repeat.set(1 / spriteSheetData.length, 1);
    spritesheetTexture.needsUpdate = true;    

    const frameCount = spriteSheet.frameCount; 
    frameSetLengths.push(frameCount);

    this.gifs[index].spritesheetTexture = spritesheetTexture;
    this.gifs[index].frames = frames;
    this.gifs[index].gifCount = this.gifCount;
  });

  

  gifWorker.postMessage({method:'animate',
    data:{
      sharedBuffer,
      frameSetLengths
    }}
  );

}

      loadGifs = async (gifs) => {

        let that = this;
        this.gifs =gifs;
        this.gifCount = this.gifs.length;        
        console.log('loadGifs: ',this.gifs.length);

        let gifUrls = this.getGifUrls();
        let payload = {method:'prepareGifs',
        data:gifUrls}
        console.log('payload: ');

        console.log(payload);
        gifWorker.postMessage(payload);  

      }

      getGifUrls = () =>{
        let gifUrls = [];
        this.gifs.forEach((gifItem, index) => {
          let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
          gifUrls.push(url);
        });
        return gifUrls;
      }

      updateGifs = ()=>{
        let that = this;
        this.gifs.forEach((gifItem, index) => {
          if(gifItem.mesh){
            if ((gifItem.mesh.material)&&(gifItem.sharedArray)) {

                  let xOffSet = that.sharedArray[1 + that.gifCount + index];
                  gifItem.mesh.material[5].map.offset.x =xOffSet;
                
           
            }
          }
      });        
    }

}
export {Giffer}