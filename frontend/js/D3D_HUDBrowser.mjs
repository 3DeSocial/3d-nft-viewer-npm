import * as THREE from 'three';
import domtoimage from 'dom-to-image';

export default class HUDBrowser  {

    constructor(config) {

        let defaults = {
            renderer: null,
            defaultContent: 'Initializing...',
        };
    
        this.config = {
            ...defaults,
            ...config
        };
     
     
        this.selectedItem = null;
        this.thumEl = document.querySelector('img#sp-img');
        console.log(this.thumEl);

    }

    setSelectedItem = (item) =>{
        //store refrerence to selected item
        this.selectedItem = item;

        //show helper
        this.selectedItem.isSelected = true;
        if(!this.selectedItem.helper){
            if(item.isVRM){
                this.selectedItem.helper = new THREE.BoxHelper( item.mesh.scene, 0x00FF00 );
            } else {
                this.selectedItem.helper = new THREE.BoxHelper( item.mesh, 0x00FF00 );
            }
        };
        this.config.scene.add(this.selectedItem.helper); 
        if(this.selectedItem.config.nft){
            this.showSelectedThumbnail();
            let preview = document.querySelector('#select-preview');
            preview.style.display = 'inline-block';
            this.nftDisplayData = this.selectedItem.parseNFTDisplayData();               
        } 
     
    }
    
    showSelectedThumbnail = () =>{
        console.log(this.selectedItem.config);
        if(this.selectedItem.config.nft.imageURLs[0]){
             this.thumEl.src = this.selectedItem.config.nft.imageURLs[0]; 
        };
    }

    createContainerBox = (mesh) =>{

        let newMeshBounds = new THREE.Box3().setFromObject( mesh );
        console.log('newMeshBounds',newMeshBounds);
        let newLengthMeshBounds = {
            x: Math.abs(newMeshBounds.max.x - newMeshBounds.min.x)+0.5,
            y: Math.abs(newMeshBounds.max.y - newMeshBounds.min.y)+0.5,
        };      
            console.log('newLengthMeshBounds',newLengthMeshBounds);

        const geometry = new THREE.PlaneGeometry(newLengthMeshBounds.x, newLengthMeshBounds.y);
        const material = new THREE.MeshBasicMaterial({
            color:  0x99FF99
        });

        let cbox = new THREE.Mesh( geometry, material );
        cbox.position.copy(mesh.position);
        cbox.position.z = box.position.z-0.25;
        this.config.scene.add(cbox);        

        if(mesh.rotation.y===0){
            console.log('no rotation needed');
        } else {
            console.log('rotating by ',mesh.rotation.y);
            cbox.rotateY(mesh.rotation.y);            
        };
        return cbox;

    }

    unSelectItem = () =>{
        if(!this.selectedItem){
            return false;
        };
        this.config.scene.remove(this.selectedItem.helper);
        this.selectedItem.isSelected = false;
        this.selectedItem = null;
        let preview = document.querySelector('#select-preview');
        preview.style.display = 'none';
        this.nftDisplayData = null;


    }


    init = () =>{
    
        this.initSourceDiv();

    }

    getSelectedItem = ()=>{
        return this.selectedItem;
    }

    getDiamondsToSendCount = ()=>{
        let diamondCountEl = document.querySelector('#d-count');
        return parseInt(diamondCountEl.innerHTML.trim());        
    }


    getHeartStatus = () =>{
        let heartIcon = document.getElementById('heart');
        return (heartIcon.style.display === 'inline-block')?true:false;        
    }

    getBuyNowStatus = () => {
        console.log('action: buyNow', this.selectedItem.config.nft.postHashHex);
    }


    getBidStatus = () => {
        console.log('action: Bid on', this.selectedItem.config.nft.postHashHex);
    }

    openBuyNFT = () =>{
        this.config.chainAPI.openBuyNFT(this.selectedItem.config.nft.postHashHex);
    }

    openNFTPage = () =>{
        this.config.chainAPI.openNFTPage(this.selectedItem.config.nft.postHashHex);
    }

    displayConfirmationPopUp = () =>{

        let heartStatus = this.getHeartStatus();
        let diamondCount = this.getDiamondsToSendCount();
        let buyNow = this.getBuyNowStatus();
        let bitStatus = this.getBidStatus();
        let selectedItemHash = this.selectedItem.config.nft.postHashHex;
        console.log('heartStatus: ',heartStatus);
        console.log('diamondCount: ',diamondCount);
        console.log(this.selectedItem.config.nft.postHashHex);
        console.log(selectedItemHash);
//        console.log('diamondCount: ',diamondCount);

       let msg = '<div class="flex-left">';
                msg = msg+ '<h4>Minted By '+this.nftDisplayData.creator+'</h4><p>'+this.nftDisplayData.description+'</p></div>';

                msg = msg+ '<div class="flex-right">';

                msg = msg+ '<h4>Confirm Actions</h4>';
                msg = msg+ '<dl>';

                if(heartStatus===true){
                    msg = msg+ '<dt>Send Like</dt>';
                    msg = msg+ '<dd><button id="btn-cfn-like">OK</button></dd>';            
                };
                if(diamondCount>0){
                    msg = msg+ '<dt>Send <span id="confirm-diamond">'+diamondCount+'</span> Diamonds</dt>';
                    msg = msg+ '<dd><button id="btn-cfn-dmd">OK</button></dd>';           
                };
                if(this.nftDisplayData.isBuyNow){
                    msg = msg+ '<dt>Buy Now For <span id="confirm-buy-now">'+this.nftDisplayData.buyNowPrice+' DeSo</span></dt>';
                    msg = msg+ '<dd><button id="btn-cfn-buy">OK</button></dd>';     
                };
           
                msg = msg+ '<dl>'
                msg = msg+ '</div>';
           this.show(msg);

    }

    initSourceDiv = () =>{
        let that = this;

        this.sourceDiv = document.querySelector('#hud-content');
        if(!this.sourceDiv){
            this.createSourceDiv();
        }
        this.closeBtn = document.querySelector('#close-hud');

        
       this.closeBtn.addEventListener('click',(e)=>{
            that.hide();
        });
    }

    createSourceDiv =()=>{
        newEl = document.createElement('div');
        newEl.setAttribute("id", "hud-content");
        newEl.setAttribute("class", "hud-content");
        newEl.setAttribute("style", "display: none;");
        document.body.appendChild(newEl);
        this.sourceDiv = newEl;

    };

    show = (msg) =>{
        if(msg){
            this.updateOverlayMsg(msg);
        };
        this.sourceDiv.style.display = 'inline-block';
        this.sourceDiv.classList.add('.show-hud');

    }

    hide = () =>{
        this.sourceDiv.style.display = 'none';
    }   

    clear = () =>{
        this.updateOverlayMsg('');
    }

    updateOverlayMsg = (msg) =>{
        document.querySelector('#hud-text').innerHTML = msg;
    }

    updateHUDTexture = (dataUrl)  =>{
        let that = this;
        var texture;
        var imageElement = document.createElement('img');
        imageElement.onload = function(e) {
          const textureLoader = new THREE.TextureLoader()
          const texture = textureLoader.load(this.src);
          console.log('image width and height');
          console.log(this.width, this.height);
            that.HUDplane.material.map = texture;
            that.HUDplane.material.needsUpdate = true;
        };
        imageElement.src = dataUrl;
    }

    render = () =>{
        this.renderer.clearDepth();
        this.renderer.render(this.sceneHUD,this.cameraHUD);
    }
}
export {HUDBrowser}