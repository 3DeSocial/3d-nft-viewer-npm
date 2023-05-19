//import workerURL from '$lib/workers/gifWorker.js?url';
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

  loadWorker = async (workerURL) => {
    console.log('process.client: ',process.client);
      gifWorker = new Worker(workerURL, { type: "module" });

        gifWorker.onmessage = (event) => {
          console.log('event: ',event);
          switch(event.data.method){
            case 'sharedArrayUpdate':
              this.updateGifs();
            break;
            case 'prepareGifs':
              this.startAnimation(event.data.payload);
              break;
            } 
          
        };    
   }
    
   startAnimation = async (spriteSheetData) => {
    // spritesheet created and recieved back from worker

  const sharedBuffer = new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * (1 + spriteSheetData.length * 5));
  const sharedArray = new Float64Array(sharedBuffer);

  let frameSetLengths = [];
  spriteSheetData.forEach((spriteSheet, index) => {

    const imageBitmap = spriteSheet.spriteSheet;

    const spritesheetTexture = new THREE.Texture(imageBitmap);
    spritesheetTexture.repeat.set(1 / spriteSheetData.length, 1);
    spritesheetTexture.needsUpdate = true;    

    const frameCount = spriteSheet.frameCount; 
    frameSetLengths.push(frameCount);

    that.gifs[index].spritesheetTexture = spritesheetTexture;
    that.gifs[index].frames = frames;
    that.gifs[index].gifCount = that.gifCount;
  });

  

  gifWorker.postMessage({method:'animate',
    data:{
      sharedBuffer,
      frameSetLengths
    }}
  );

  }

    createSpritesheet = (frames) => {
        const spritesheetCanvas = document.createElement('canvas');
        spritesheetCanvas.width = frames[0].dims.width * frames.length;
        spritesheetCanvas.height = frames[0].dims.height;
        spritesheetCanvas.style.display = 'none';
        const ctx = spritesheetCanvas.getContext('2d');
      
        frames.forEach((frame, index) => {
          const frameImageData = new ImageData(
            new Uint8ClampedArray(frame.patch.buffer),
            frame.dims.width,
            frame.dims.height
          );
          ctx.putImageData(frameImageData, index * frame.dims.width, 0);
        });
      
        return spritesheetCanvas;
      }
      
      loadGifAsSpritesheet = async (gifItem, index) => {
        let url = this.config.proxy+gifItem.config.nft.imageURLs[0];
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const gifData = parseGIF(buffer);
        const frames = decompressFrames(gifData, true);
      
        const spritesheetCanvas = this.createSpritesheet(frames);
        const spritesheetTexture = new THREE.CanvasTexture(spritesheetCanvas);
        spritesheetTexture.matrixAutoUpdate = true;
        spritesheetTexture.repeat.set(1 / frames.length, 1);
        gifItem.spritesheetTexture = spritesheetTexture;
        gifItem.frames = frames;
        gifItem.gifCount = this.gifCount;
        return gifItem;
      }

      loadGifs = async (gifs) => {

        let that = this;
        this.gifs =gifs;
        this.gifCount = this.gifs.length;        
        console.log('loadGifs: ',this.gifs.length);

        let gifUrls = this.getGifUrls();
        let payload = {method:'prepareGifs',
        data:gifUrls}
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