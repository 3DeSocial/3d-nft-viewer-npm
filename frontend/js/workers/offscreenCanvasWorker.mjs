export const name = 'CanvasWorker';

import * as THREE from 'three';    
import * as D3D from '3d-nft-viewer'

console.log('worker script!!');
const handlers = {
  main,
};
 
self.onmessage = function(e) {
  console.log(e);
  const fn = handlers[e.data.type];
  if (typeof fn !== 'function') {
    throw new Error('no handler for type: ' + e.data.type);
  }
  fn(e.data);
};

main = (data) =>{
  console.log('recieved data: ', data);
  const {canvas} = data.canvas;
    //initialize NFT viewer front end
  let spaceViewer = new D3D.D3DSpaceViewer(options);

}