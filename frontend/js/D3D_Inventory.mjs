import * as THREE from 'three';

export const name = 'd3d-inventory';
let loader;

import { Item, Item2d, ItemVRM, ChainAPI, ExtraData3DParser } from '3d-nft-viewer';

 class D3DInventory {
    
    constructor(config) {

        let defaults = {
                    items: [],
                    items2d: [],
                    items3d: []
                };
        
        this.config = {
            ...defaults,
            ...config
        };
        this.items2d = [];
        this.items3d = [];
        this.items = [];
        this.scene = this.config.scene;
        this.loader = this.config.loader;
        this.chainAPI = new ChainAPI(this.config.chainAPI);
        this.activeItemIdx = 0;
        this.placedItems3D = [];
        this.center = new THREE.Vector3(0,0,0);
        if((this.config.items3d.length>0)||(this.config.items2d.length>0)){
            this.load();
        }
      
    }

    import = () =>{
        /*  - takes the raw nft hash list
            - parses extra data
            - determines which type of item the nft becomes  (2d or 3D)
            - optional: preloads asset */
        this.fetchNFTMeta(this.config.items);

    }


    importToLayout = () =>{
        /*  - takes the raw nft hash list
            - parses extra data
            - determines which type of item the nft becomes  (2d or 3D)
            - optional: preloads asset */
        this.fetchNFTMeta(this.config.items);

    }

    load = () =>{
        
        this.items = [];
        let that = this;

        this.initItems2d(this.config.items2d).then((nfts2d)=>{
            if(nfts2d){
                that.items2d = nfts2d;     
            };

        })

        this.initItems3d(this.config.items3d).then((nfts3d)=>{
            if(nfts3d){
                that.items3d = nfts3d;     
            };

        })
    }

    initItems2d = (itemList)=>{
        let that = this;
        let items = [];
        let noPositions = this.config.layoutPlotter.initPosQ({defaltDims:{width:this.config.width,
                                                            height:this.config.height,
                                                            depth:this.config.depth}});
        let center = this.center;
        //console.log('initItems: ',itemList,noPositions);

        let noNfts = itemList.length;
        let noNftsToPlace = Math.min(noPositions,noNfts);

        return new Promise((resolve, reject) => {

            itemList.forEach((itemData)=>{
            //    console.log(itemData)
                let item ;
                let itemConfig;
                if(itemData.params){
                    itemConfig = itemData.params;
                } else {
                    itemConfig = itemData;
                };

                if(!itemConfig.width){
                    itemConfig.width = itemData.width;
                    if(!itemData.width){
                        itemConfig.width = that.config.width;
                    }
                };

                if(!itemConfig.depth){
                    itemConfig.depth = itemData.depth;
                    if(!itemData.depth){
                        itemConfig.depth = that.config.depth;
                    }
                };

                if(!itemConfig.height){
                    itemConfig.height = itemData.height;
                    if(!itemData.height){
                        itemConfig.height = that.config.height;
                    }
                };

                itemConfig.scene = this.scene;
                itemConfig.loader = this.loader;
                itemConfig.modelsRoute = this.config.modelsRoute;
                itemConfig.nftsRoute = this.config.nftsRoute;
                if(itemData.layout){
                    itemConfig.layout = itemData.layout;               
                };
                if(itemData.nft){
                    itemConfig.nft = itemData.nft;        
                    if(itemData.nft.isAudio){
                        itemConfig.isAudio = itemData.nft.isAudio;               
                       // console.log('audio found: ');
                       // console.log(itemData);
                    };
                };
                itemConfig.imageProxyUrl = that.config.imageProxyUrl;
                itemConfig.isImage = true;
                itemConfig.spot = that.config.layoutPlotter.getNextFreePos();

                item = this.initItem2d(itemConfig);
                item.initMesh(itemConfig).then((nftImgData)=>{
                  let spot = nftImgData.spot;
                    let halfHeight = nftImgData.height/2;
                  //  console.log('halfHeight: ',halfHeight,nftImgData);
                        spot.pos.y = spot.pos.y+halfHeight;

                     item.place(spot.pos).then((mesh,pos)=>{
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
                        
                        items.push(item);

                        that.items2d.push(item);                            
                        if(items.length===itemList.length){
                            resolve(items);
                        }
                    });


                }).catch(err=>{
                   // console.log('no image, skip NFT');
                })           
               
               

            });
        })      

    }

    initItems3d = (itemList)=>{
        let that = this;

        if(!this.config.layoutPlotter.posQ){
            this.config.layoutPlotter.initPosQ({defaltDims:{width:this.config.width,
                                                            height:this.config.height,
                                                            depth:this.config.depth}});
        };

        let noPositions = this.config.layoutPlotter.getMaxItemCount3D();
        let noNfts = itemList.length;
        let noNftsToPlace = Math.min(noPositions,noNfts);
        let items = [];
        return new Promise((resolve, reject) => {

              //  console.log('initItems');
            itemList.forEach((itemData)=>{
              //  console.log(itemData)
                let itemConfig;
                if(itemData.params){
                    itemConfig = itemData.params;
                } else {
                    itemConfig = itemData;
                };
                if(!itemConfig.width){
                    itemConfig.width = itemData.width;
                }
                if(!itemConfig.depth){
                    itemConfig.depth = itemData.depth;
                }
                if(!itemConfig.height){
                    itemConfig.height = itemData.height;
                }

                itemConfig.scene = this.scene;
                itemConfig.loader = this.loader;
                itemConfig.modelsRoute = this.config.modelsRoute;
                itemConfig.nftsRoute = this.config.nftsRoute;
                if(itemData.layout){
                    itemConfig.layout = itemData.layout;               
                };
                if(itemData.nft){
                    itemConfig.nft = itemData.nft;               
                };


                if(!itemData.path3D){
                    console.log('no path3D on itemData');
                    console.log(itemData);
                    console.log(itemConfig);
                };
                /*let path3D = versions[0];
                let params;
                if(path3D.indexOf('.')>-1){ // there is a file extension
                let modelUrl = extraDataParser.getModelPath(0,'gltf','any');*/
                let extraDataParser = new ExtraData3DParser({ nftPostHashHex: itemData.postHashHex,
                                                              extraData3D:itemData.path3D,
                                                              endPoint:'https://desodata.azureedge.net/unzipped/'});

                let spot = that.config.layoutPlotter.getNextFreePos3d();
                let yPos = that.config.layoutPlotter.findFloorAt(spot.pos,4,0); 
                spot.pos.y = yPos;

                let formats = extraDataParser.getAvailableFormats();                    
                let models = extraDataParser.getModelList();
                let modelUrl = extraDataParser.getModelPath(0,'gltf','any');

                let item = null;  
                if(modelUrl){
                    item = this.initItem({modelUrl: modelUrl,
                                    nftPostHashHex: itemData.postHashHex, 
                                                pos: spot.pos,
                                                rot:spot.rot,
                                                nft:itemData,
                                                width: 3,
                                                height:3,
                                                depth:3,
                                                scene: that.scene,
                                                format: formats[0]});
                  //  console.log('item returned. have modelUrl: ',modelUrl, ' format: ',formats[0]);
                } else {


                    let versions = extraDataParser.getAvailableVersions(0,'gltf');
                 //   console.log('versions:', versions);
                    if( versions[0]){
                       let path3D = versions[0];
                    }
                    let nftRequestParams = {
                        postHex: itemData.postHashHex,
                        path: '/'+path3D,
                        format: 'gltf'
                      };
                    item = this.initItem({nftRequestParams: nftRequestParams, nftPostHashHex: itemData.postHashHex, pos:spot.pos, rot:spot.rot, nft:itemData, width: 3, height:3, depth:3, scene: that.scene, format: formats[0]});
                   // console.log('item API request requried for modelUrl: ',modelUrl, ' format: ',formats[0]);

                }      

             //   console.log('placing item of format ',formats[0]);
               // console.log(item);
                item.place(spot.pos).then((mesh,pos)=>{
                 //   console.log('placed at ',spot.pos,mesh);
                    if(spot.rot){                    
                        if(item.isVRM){
                            mesh.scene.rotateY(spot.rot.y);
                        };

                        if(mesh.rotateY){
                            mesh.rotateY(spot.rot.y);
                        };

                    };
                    items.push(item);
                    this.placedItems3D.push(item);
                    that.items3d.push(item); 
                    if(items.length===itemList.length){
                        resolve(items);
                    }
                });
            });
        })      
    }
    
    initItem = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';
        let item = null;

        let itemParams = {
            three: THREE,
            scene: this.scene,
            height: opts.height,
            width: opts.width,
            depth: opts.depth,
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            isImage: false,
            layout: opts.layout,
            loadingScreen: this.config.loadingScreen,
            format: opts.format
        };

        if(this.config.physicsWorld){
            itemParams.physicsWorld = this.config.physicsWorld;
        };

        if(opts.nft){
            itemParams.nft = opts.nft;
        } else {
            console.warn('initItem: !!!! NO NFT!!!2');
            console.log(opts);
        };

        if(opts.modelUrl){
            itemParams.modelUrl = opts.modelUrl;
        };

        if(opts.position){
            itemParams.position = opts.position;
        }

        if(opts.rotation){
            itemParams.rotation = opts.rotation;
        }

        if(opts.width){
            itemParams.width = opts.width;
        }

        if(opts.height){
            itemParams.height = opts.height;
        }

        if(opts.depth){
            itemParams.depth = opts.depth;
        }

        if(opts.mesh){
            itemParams.mesh = opts.mesh;
        } else {
             itemParams.loader = this.config.loaders.getLoaderForFormat(opts.format);
        };


        if(opts.isImage){
            itemParams.isImage = opts.isImage;
        };

        if(opts.nftRequestParams){
            let nftRequestParams = opts.nftRequestParams;

            Object.keys(nftRequestParams).forEach((key, index) => {
                params.push(key+'='+nftRequestParams[key]);
            });
            paramString = params.join('&');
            itemParams.nftsRoute = this.config.nftsRoute +'?' +paramString;
            
            if(!itemParams.nftPostHashHex){
                console.log('cannot initItem without nftPostHashHex');
                return false;
            };
            if((itemParams.nftsRoute==='')&&(itemParams.modelsRoute==='')){
                console.log('cannot initItem without either modelsRoute or nftsRoute');
                return false;
            };              
        };

        if(opts.format.toLowerCase()==='vrm'){
            itemParams.animLoader = this.config.animLoader;
            item = new ItemVRM(itemParams);
        } else {
            item = new Item(itemParams);
        };


        return item;

    }

    initItem2d = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';
        let that = this;
        let itemParams = {
            three: THREE,
            imageProxyUrl: opts.imageProxyUrl,
            scene: this.scene,
            height: opts.height,
            width: opts.width,
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            isImage: false,
            layout: opts.layout,
            loadingScreen: this.config.loadingScreen,
            onLoad: ()=>{
                this.config.loadingScreen.completeLoading();
            }

        };



        if(opts.nft){
            itemParams.nft = opts.nft;
        } else {
            //console.log('initItem2d !!!! NO NFT!!!');
           // console.log(opts);
            itemParams.nft = opts
        };
        if(opts.spot){
            itemParams.spot = opts.spot;
        };
        if(opts.modelUrl){
            itemParams.modelUrl = opts.modelUrl;
        };

        if(opts.pos){
            itemParams.pos = opts.pos;
        }

        if(opts.rot){
            itemParams.rot = opts.rot;
        }

        if(opts.width){
            itemParams.width = opts.width;
        }

        if(opts.height){
            itemParams.height = opts.height;
        }

        if(opts.depth){
            itemParams.depth = opts.depth;
        }

        if(opts.isImage){
            itemParams.isImage = opts.isImage;
        };

        if(opts.nftRequestParams){
            let nftRequestParams = opts.nftRequestParams;

            Object.keys(nftRequestParams).forEach((key, index) => {
                params.push(key+'='+nftRequestParams[key]);
            });
            paramString = params.join('&');
            itemParams.nftsRoute = this.config.nftsRoute +'?' +paramString;
            
            if(!itemParams.nftPostHashHex){
                console.log('cannot initItem without nftPostHashHex');
                return false;
            };
            if((itemParams.nftsRoute==='')&&(itemParams.modelsRoute==='')){
                console.log('cannot initItem without either modelsRoute or nftsRoute');
                return false;
            };              
        };
        return new Item2d(itemParams);

    }

    has2d = () =>{
        return (this.config.items2d.length>0);
    }

    has3d = () =>{
        return (this.config.items3d.length>0);
    }

    getActiveItem = () =>{
        if(!this.activeItemIdx){
            console.log('no active item');
            return false;
        };
        if(!this.items[this.activeItemIdx]){
            return false;
        }
        return this.items[this.activeItemIdx];
    }

    getItems = () =>{
        return this.items;
    }

    getItems2d = () =>{
        return this.items2d;
    }

    getItems3d = () =>{
        return this.items3d;
    }

    getItemWithFilter = (filter) =>{
        return this.items.filter(filter);
    }
    getItemByHash = (nftPostHashHex) =>{
        if(!this.items){
            console.log('no inventory items');
            return false;
        };
        console.log('checking inventory ',this.items);
        let idx = 1;
        let item = this.items[0];
        while((item.config.nftPostHashHex !== nftPostHashHex)&&(idx<this.items.length)){
            item = this.items[idx];
            ++idx;
        };
        console.log(item.config.nftPostHashHex,'?',nftPostHashHex);
        if(item.config.nftPostHashHex === nftPostHashHex){
            return item;
        };
        return false;
    }

    getItemByIdx = (index) =>{
        return this.items[index];
    }

    setActive = (index)=> {
        if(this.items[index]){
            this.activeItemIdx = index;
            console.log('Item ',index,' is active.');
        }
    }

    updateAnimations = (delta) =>{
        //update all visible items running animations in sceneInventory
        this.placedItems3D.forEach((item)=>{
            if((item.mixer !== null)){
                item.mixer.update( delta );

                if(item.mesh.update){
                    item.mesh.update();
                };
            };
        })
    }
 }
export {D3DInventory};