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
            this.selectedItem.helper =
           this.selectedItem.helper = new THREE.BoxHelper( item.mesh, 0x00FF00 );
        };
        this.config.scene.add(this.selectedItem.helper); 
        this.showSelectedThumbnail();       
        let preview = document.querySelector('#select-preview');
        preview.style.display = 'inline-block';
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

    }


    init = () =>{
    
        this.initSourceDiv();

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
        console.log('action: buyNow', this.selectedItem.nft.nftPostHashHex);
    }


    getBidStatus = () => {
        console.log('action: Bid on', this.selectedItem.nft.nftPostHashHex);
    }


    displayConfirmationPopUp = () =>{
        let heartStatus = this.getHeartStatus();
        let diamondCount = this.getDiamondsToSendCount();
        let buyNow = this.getBuyNowStatus();
        let bitStatus = this.getBidStatus();

        console.log('heartStatus: ',heartStatus);
        console.log('diamondCount: ',diamondCount);
        console.log(this.selectedItem.nft.nftPostHashHex);

//        console.log('diamondCount: ',diamondCount);

       /* let msg = '<div class="flex-left">';
                msg = msg+ '<h4>Minted By '+data.creator+'</h4><p>'+data.description+'</p></div>';

                msg = msg+ '<div class="flex-right">';

                msg = msg+ '<dt>Minted</dt>';
                msg = msg+ '<dd>'+data.created+'</dd>';

                msg = msg+ '<dt>Copies</dt>';
                msg = msg+ '<dd>'+data.copies+'</dd>';            

                msg = msg+ '<dt>Copies For Sale</dt>';
                msg = msg+ '<dd>'+data.copiesForSale+'</dd>';                       
                if(data.isBuyNow){
                    msg = msg+ '<dt>Buy Now Price</dt>';
                    msg = msg+ '<dd>'+data.buyNowPrice+' DeSo</dd>';                
                };
                msg = msg+ '<dt>Highest Sale Price</dt>';
                msg = msg+ '<dd>'+data.maxPrice+' DeSo</dd>';

                msg = msg+ '<dt>Last Bid Price</dt>';
                msg = msg+ '<dd>'+data.lastBidPrice+' DeSo</dd>';                
/*
                msg = msg+ '<dt>Auction End Time:</dt>';
                msg = msg+ '<dd>'+data.endTime+'</dd>';                

                msg = msg+ '<dl>'
                msg = msg+ '</div>'      */          
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