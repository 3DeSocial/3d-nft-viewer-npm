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
console.log('inventoryconfig', this.config);
        this.load();
      
    }

    load = () =>{
        this.initItems(this.config.items);
    }

    initItems = (itemList)=>{

        let that = this;

        itemList.forEach((itemData)=>{
            let itemConfig = itemData.params;
            itemConfig.width = this.config.width;
            itemConfig.depth = this.config.depth;
            itemConfig.height = this.config.height;
            itemConfig.three = THREE;
            itemConfig.scene = this.scene;
            itemConfig.loader = this.loader;
            itemConfig.modelsRoute = this.config.modelsRoute,
            itemConfig.nftsRoute = this.config.nftsRoute            
            let item = this.initItem(itemConfig)

            that.items.push(item);

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
            loader: this.config.loaders.getLoaderForFormat(opts.format),
            nftPostHashHex: nftPostHashHex,
            modelsRoute: this.config.modelsRoute,
            nftsRoute: nftsRoute

        };
        if(opts.nftRequestParams){
            let nftRequestParams = opts.nftRequestParams;

            Object.keys(nftRequestParams).forEach((key, index) => {
                params.push(key+'='+nftRequestParams[key]);
            });
            paramString = params.join('&');
            itemParams.nftsRoute = this.config.nftsRoute +'?' +paramString;
        };
             
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