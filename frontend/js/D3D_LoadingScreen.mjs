export default class LoadingScreen {

    //return HTML template for loading screen
    constructor(config){
        let defaults = {
            nftCount: 0,
            loadingMsg: 'Loading...',
            updateMsg: 'Please wait a moment..',
            description: 'This is a dynamically generated space displaying the latest NFTs created by <span class="ownername">'+config.ownerName+'</span>'
        };
    
        this.config = {
            ...defaults,
            ...config
        };

        this.config;
        this.loadingItems = [];


    }

    renderTemplate = (data) =>{
    	data = {...this.config,...data};
    	let template =  '<div class="inner">';
    					template +='<h1><span class="ownername">'+data.ownerName+'</span>\'s Gallery</h1>';
						template +='<img class="owner-profile-pic" src="https://node.deso.org/api/v0/get-single-profile-picture/'+data.ownerPublicKey+'"/>';
						//template +='<p class="description"><pre>'+data.ownerDescription+'</pre></p>';
						template +='<p class="loading-msg">'+data.loadingMsg+'</p>';
						template +='<p class="loading-update">'+data.updateMsg+'</p>';
						template +='<div class="spinner"></div>';
						template +='<div class="social-logo"><p class="devby">3D Developed by</p><img src="/images/logoNFTZ.png"/></div>';						
						template +='</div>';
        return template
    }

    startLoading = (toLoad)=>{
        let that = this;
        toLoad.items.forEach((item, idx)=>{
            let loadItem = {'name':toLoad.name};
            that.loadingItems.push(loadItem);
            that.displayUpdate('Loading '+toLoad.name+' '+(idx+1)+' of '+this.loadingItems.length);
        });
        this.initialLoadLength =this.loadingItems.length;
    }

    completeLoading = () =>{
        this.loadingItems.pop();
        this.displayUpdate('NFTs to load '+(this.loadingItems.length));

    }
    displayMsg = (msg) =>{
    	document.querySelector('.loading-msg').innerHTML = msg;
    }	

    displayUpdate = (msg) =>{
    	document.querySelector('.loading-update').innerHTML = msg;
    }

    render  = (ctrCls) =>{
    	let ctr = document.querySelector(ctrCls);

    	let frag = document.createRange().createContextualFragment(this.renderTemplate());
    	ctr.appendChild(frag);

    }

    hide = () =>{
       let ls = document.querySelector('.loader-ctr');
        ls.style.display = 'none';
    }
    
    show = () =>{
       let ls = document.querySelector('.loader-ctr');
        ls.style.display = 'block';
    }
}
export {LoadingScreen}