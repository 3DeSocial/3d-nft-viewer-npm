export const name = 'd3d-inventory';
let THREE, loader;
import {Item, Item2d} from '3d-nft-viewer';


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

        THREE = this.config.three;
        this.scene = this.config.scene;
        this.loader = this.config.loader;

        this.items = [];
        this.activeItemIdx = 0;
        this.load();
      
    }

    load = () =>{
        let nfts2d = this.initItems(this.config.items2d);
        let nfts3d = this.initItems(this.config.items3d);
        let allItems = [];
            allItems = allItems.concat(nfts2d);
            allItems = allItems.concat(nfts3d);
        this.items = allItems;
        this.items2d = nfts2d;
        this.items3d = nfts3d
        
    }

    initItems = (itemList)=>{

        let that = this;
        let items = [];

        itemList.forEach((itemData)=>{
            let item ;
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

            itemConfig.three = THREE;
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

            if(itemData.isImage){
                itemConfig.isImage = itemData.isImage;
                item = this.initItem2d(itemConfig)                
            } else {
                item = this.initItem(itemConfig)
            }
            if(item){
                items.push(item);
            }

        });
        return items;

    }
    
    initItem = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';


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
            layout: opts.layout
        };



        if(opts.nft){
            itemParams.nft = opts.nft;
        } else {
            console.warn('!!!! NO NFT!!!2');
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
        return new Item(itemParams);

    }

    initItem2d = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';


        let itemParams = {
            three: THREE,
            scene: this.scene,
            height: opts.height,
            width: this.config.width,
            depth: this.config.depth,
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: this.config.nftsRoute,
            isImage: false,
            layout: opts.layout
        };



        if(opts.nft){
            itemParams.nft = opts.nft;
        } else {
            console.warn('!!!! NO NFT!!!2');
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
        return new Item2d(itemParams);

    }

    has2d = () =>{
        return (this.config.items2d.length>0);
    }

    has3d = () =>{
        return (this.config.items3d.length>0);
    }

    getActiveItem = () =>{
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
 }
export {D3DInventory};