import * as THREE from 'three';

export default class NFTViewerOverlay {
    constructor(config) {

        let defaults = {
                    el: document.body,
                    handlers: {}
                };
        
        this.config = {
            ...defaults,
            ...config
        };

        this.optionsMenu = this.createOptionsMenu(this.el);
        this.addEventListeners();

    }

    createOptionsMenu = () =>{
        const node = document.getElementById("nft-overlay");
        if(node){
            let menu = node.cloneNode(true);
                menu.setAttribute('style','display:inline-block;');
                this.config.el.appendChild(menu);
                return menu;
        } else {
            return false;
        }
    }

    addEventListeners = () =>{
        let that = this;
     
        let floorCbx = this.optionsMenu.querySelector('#floor');
        floorCbx.addEventListener('change',(e)=>{
            if(that.config.handlers['floor']){
                that.config.handlers['floor'](floorCbx.checked);
            }
        });

        let skyCbx = this.optionsMenu.querySelector('#sky');
        skyCbx.addEventListener('change',(e)=>{
            if(that.config.handlers['sky']){
                that.config.handlers['sky'](skyCbx.checked);
            }
        })        
    }
}
export {NFTViewerOverlay}