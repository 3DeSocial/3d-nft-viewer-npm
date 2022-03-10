'use strict';
const axios = require('axios');
const Path = require('path');
const Fs = require('fs');
const unzipper = require('unzipper');

class NFTReader {

  constructor(config) {
    let defaults = {
      nodeEndpoint: 'https://node.deso.org/api/v0/',
      readerPublicKey: '',
      modelStorageDir: 'public/models/'
    };
    this.config = {...defaults, ...config};
    this.initDeSoClient();
  }

  buildModelUrlFromFiles = (nftPostHashHex) =>{
    // we know that the nft has been extracted and need to return the model url for display in three js
    var results = [];

    let extractPath = Path.resolve(this.config.modelStorageDir+nftPostHashHex);

    // try to find glb first for best performance
    let modelFormat = 'glb';

    this.fileSearchRecurs(extractPath, '.'+modelFormat, results);

    if(results.length === 0){
      //couldnt find glb so try gltf next
       modelFormat = 'gltf';
       this.fileSearchRecurs(extractPath, '.'+modelFormat, results);    
    }
    let fileLocation = results[0];
    let fileLocationParts = fileLocation.split(nftPostHashHex);
    let modelUrlLocal = fileLocationParts[1];
        modelUrlLocal = modelUrlLocal.replace(/\\/g, '/');

    return modelUrlLocal;
  }

  fileSearchRecurs = (startPath,filter, results)=> {

    if (!Fs.existsSync(startPath)){
        return;
    }
    var files=Fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=Path.join(startPath,files[i]);
        var stat = Fs.lstatSync(filename);
        if (stat.isDirectory()){
            this.fileSearchRecurs(filename,filter, results); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
            results.push(filename);
        };
    };
  };

  initDeSoClient(){

    this.desoNodeClient = axios.create({
      baseURL: this.config.nodeEndpoint,
      withCredentials: false,
      headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
              }
    });  

    this.desoNodeClient.interceptors.response.use(
        (response) => {
            return response;
        },
        function (error) {
            console.log(error);
            return Promise.reject(error);
        }
    );
    console.log('client initialized');
  }

  retrieveNFT(nftPostHashHex) {
    
    let that = this;

    return new Promise(( resolve, reject ) => {
      let modelUrl = null;
      if(that.modelIsExtracted(nftPostHashHex)){

        modelUrl = that.buildModelUrlFromFiles(nftPostHashHex);
        resolve({success:true, modelUrl:modelUrl});

      } else {

        that.fetchNft(nftPostHashHex)
        .then(r => that.downloadNFTZip(nftPostHashHex, r))
        .then((savePath) => that.extractModel(nftPostHashHex, savePath))
        .then(files =>{
          modelUrl = that.buildModelUrlFromFiles(nftPostHashHex);
          resolve({success:true, modelUrl:modelUrl});
        }).catch(err=>{
          console.log(err);
          resolve({success:true, modelUrl:modelUrl});
        })

      }
    });

  }

  fetchNft(nftPostHashHex) {

    const payload = {
        ReaderPublicKeyBase58Check: this.config.readerPublicKey,
        PostHashHex: nftPostHashHex
    };

    const payloadJson = JSON.stringify(payload);
    return this.desoNodeClient.post('get-single-post', payloadJson, {
              headers: {
                    // Overwrite Axios's automatically set Content-Type
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
          });
  }

  downloadNFTZip(nftPostHashHex, r){
    let nftData = r.data;
    let previewImg = (r.data.PostFound.ImageURLs[0]?nftData.PostFound.ImageURLs[0]:null);
    let extraData = nftData.PostFound.PostExtraData['3DExtraData'];
    let models = this.parse3DExtraData(extraData);
    let arweaveUrl = models[0].ModelUrl;

    let tempDir = 'models_tmp/'+nftPostHashHex;

    let tempDirPath = Path.resolve('public', 'models_tmp/',nftPostHashHex);
    this.makeDirIfNotExists(tempDirPath);

    let filename = nftPostHashHex+'.zip';
    let savePath = Path.resolve('public', 'models_tmp/',nftPostHashHex, filename);
    const writer = Fs.createWriteStream(savePath);

    axios({
      url: arweaveUrl,
      method: 'GET',
      responseType: 'stream'
    }).then((response)=>{
      response.data.pipe(writer);
    });

    return new Promise((resolve, reject) => {
      writer.on('finish', ()=>{
        console.log('write complete to savePath:'+savePath);
        resolve(savePath);
      })
      writer.on('error', (err)=>{
        reject('error writing dled zip file',err);
      })
    })

  }

  extractModel(nftPostHashHex, savePath){

    let modelVersionFolderName = ''; //default
    let extractPath = Path.resolve('public', 'models/',nftPostHashHex);
    var modelFormat = '';

    return new Promise(( resolve, reject ) => {
      let that = this;

      if(Fs.existsSync(savePath)) {

        unzipper.Open.file(savePath)
          .then(d => d.extract({path: extractPath, concurrency: 5}))
          .then(()=>{
            let modelUrl = that.buildModelUrlFromFiles(nftPostHashHex);
            resolve({succes:true,modelUrl:modelUrl});
        })
        .catch(err=>{
          console.log('extract err: ');
          console.log(err);
          reject({success:false,err:err});
        });        
      } else {
        reject({success:false,err:'The file does not exist: '+savePath});
      };

    });
  }

  makeDirIfNotExists(dirPath){
    if (!Fs.existsSync(dirPath)) {
      Fs.mkdirSync(dirPath, (err) => {
        if (err) {
            return console.error(err);
        }
      });
    };
  }

   modelIsExtracted(nftPostHashHex) {
    let destDirPath = Path.resolve(this.config.modelStorageDir+nftPostHashHex);
    if(Fs.existsSync(destDirPath)){
      return true;
    };
    return false;
  }

  parse3DExtraData = (NFT3DData) =>{
    let modelExtraData = JSON.parse(NFT3DData);
    return modelExtraData['3DModels'];
  }
};

module.exports = NFTReader;