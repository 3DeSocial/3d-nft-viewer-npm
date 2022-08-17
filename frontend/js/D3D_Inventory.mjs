export const name = 'd3d-inventory';
let THREE, loader, OrbitControls, XRControllerModelFactory, VRButton;
import {Item} from '3d-nft-viewer';


 class D3DInventory {
    
    constructor(config) {

        let defaults = {
                    items: []
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
        this.initItems(this.config.items);
    }

    initItems = (itemList)=>{

        let that = this;

        itemList.forEach((itemData)=>{

            let itemConfig;
            if(itemData.params){
                itemConfig = itemData.params;
            } else {
                itemConfig = itemData;
            };
            if(!itemConfig.width){
                itemConfig.width = this.config.width;
            }
            if(!itemConfig.depth){
                itemConfig.depth = this.config.depth;
            }
            if(!itemConfig.height){
                itemConfig.height = this.config.height;
            }

            itemConfig.three = THREE;
            itemConfig.scene = this.scene;
            itemConfig.loader = this.loader;
            itemConfig.modelsRoute = this.config.modelsRoute,
            itemConfig.nftsRoute = this.config.nftsRoute;

            if(itemData.nft){
                itemConfig.nft = itemData.nft;               
            } else {
                console.warn('!!!! NO NFT in ItemList!!!');
                console.log(itemData);           
            };

            if(itemData.isImage){
                itemConfig.isImage = itemData.isImage;
            };
            let item = this.initItem(itemConfig)
            if(item){
                that.items.push(item);
            }

        })

    }
    
    initItem = (opts) =>{

        let nftPostHashHex = opts.nftPostHashHex;
        let paramString = '';
        let params  = [];
        let nftsRoute = '';


        let itemParams = {
            three: THREE,
            scene: this.scene,
            height: this.config.height,
            width: this.config.width,
            depth: this.config.depth,
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: nftsRoute,
            isImage: false

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
      console.log(itemParams);
        return new Item(itemParams);

    }

    getActiveItem = () =>{
        return this.items[this.activeItemIdx];
    }

    getItems = () =>{
        return this.items;
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