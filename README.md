# 3D NFT Viewer

## Description

The 3D NFT Viewer is used to display an interactive ThreeJS view of 3D models which have been minted as an NFT on the DeSo blockchain.

3D NFTs are essentials 3D model files which have been uploaded to a permanent decentralized storage network.

Metadata about the 3D model including the URL are stored in a Post transaction on the DeSo blockchain and minted to create a Non Fungible Token which can be bought and sold like any other NFT.

This repo contains front and back end code which can be used separately or in combination as in the demo.

## NPM Installation 

npm install 3d-nft-viewer

## Back End NodeJS Module
### Class: NFTReader
#### Functionality
- Checks to see if the 3D model is already downloaded to your server.
- Retrieves the NFT post data from the deso blockchain chain.
- Downloads the model assets from arweave and extracts them.
- Finds the local path of the glb or gltf model file.
- Returns the URL of the extracted 3D model which you can then use to load the model into the Front End viewer or any other 3d app or metaverse experience.

#### Express JS Example 

In the example below nftPostHashHex is the token that identifies the individual NFT You will see this during the minting process and on any DeSo node that displays your NFT.

https://docs.deso.org/for-developers/backend/blockchain-data/basics/data-types#postentryresponse

```
var express = require('express');
var router = express.Router();
var D3DNFT = require('3d-nft-viewer');

router.post('/:nftPostHashHex', (req, res) => {

  const nftPostHashHex = req.params.nftPostHashHex;

  let nftReader = new D3DNFT.NFTReader({
      nodeEndpoint: 'https://node.deso.org/api/v0/',  // DeSo API Endpoint (any node can be used)
      readerPublicKey: '<Your DeSo Public Key>',
      modelStorageDir: 'public/models/' // public directory to serve the model files
  });

  nftReader.retrieveNFT(nftPostHashHex)
  .then((responseJson)=>{
    res.send(responseJson);
  }).catch((responseJson)=>{
    console.log(responseJson);
    console.log('retrieveNFT error');
    res.send(responseJson);
  });
});

module.exports = router;
```

## Front End Three JS Plugin
### Class: Viewer
#### Functionality
- Searches the DOM for elements with the nft-viewer css class name. For best results we recommend this is the container for a preview image showing a rotating gif of the 3D model (this is created automatically during the minting process - see [How To Mint](https://www.youtube.com/watch?v=dhXX_bFkEf8))
- Sends an API request to the back end to fetch the URL for the 3D model file, downloading it from remote storage if necessary
- When the 3D model URL is returned, a link with text "Click to View in 3D" is appended along with a click event handler
- On click of the link the ThreeJS code replaces the image in the container element with a CANVAS tag and initializes the Three JS interactive view.

#### Example Front End Page Structure
```
  <head>
    <title>3D NFT Viewer</title>
    <link rel='stylesheet' href='/css/styles.css' />
  </head>
  <body>
    <div class="container">
		<img class="nft-preview" src="https://images.deso.org/746201e0167a8176c3c0ca2b141b4ed2c92442a1d16a55ab999a558e8a831a28.gif"/>
	</div>
	<p class="nft-viewer" data-nft="0b88277db8b3ddac74537b3f5b10897865e0fea5edcc47c86547a36fd5cf6693">Loading...</p>

  <script async src="https://unpkg.com/es-module-shims@1.3.6/dist/es-module-shims.js"></script>
    <script type="importmap">
      {
        "imports": {
          "three": "https://cdn.skypack.dev/three"
        }
      }
    </script>
    <script type="module">
      // Find the latest version by visiting https://cdn.skypack.dev/three.
      import * as THREE from 'three';


      import { OrbitControls } from 'https://unpkg.com/three@0.139.1/examples/jsm/controls/OrbitControls.js';
      import { GLTFLoader } from 'https://unpkg.com/three@0.139.1/examples/jsm/loaders/GLTFLoader.js';
      import { XRControllerModelFactory } from '/js/webxr/XRControllerModelFactory.js';

      import { VRButton } from '/js/DSO_VRButton.js';

      import { D3DNFTViewer } from '/js/3dviewer.js'

            //initialize NFT viewer front end
        let nftViewer = new D3DNFTViewer({
            three: THREE,
            GLTFLoader: GLTFLoader,
            OrbitControls: OrbitControls,
            XRControllerModelFactory: XRControllerModelFactory,
            VRButton: VRButton,
            ctrClass: 'nft-viewer', // class of div which has posthashhex attribute
            nftDataAttr: 'data-nft', // Name of attribute of of div.ctrClass which contains posthashhex
            nftsRoute: 'nfts', // Back end route to initialize NFTs
            modelsRoute: 'models', // Back end route to load models
            linkText: 'View in 3D',
            previewCtrCls: 'container', //container element in which to create the preview
            skyboxes: true
        });
        nftViewer.initNFTs();

   </script>
  </body>
</html>
```