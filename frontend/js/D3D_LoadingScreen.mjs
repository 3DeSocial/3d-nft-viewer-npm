export default class LoadingScreen {

    //return HTML template for loading screen
    constructor(config){
        let defaults = {
              loadingMsg: 'Loading...',
              updateMsg: 'Please wait a moment..',
              description: 'This is a dynamically generated space displaying the latest NFTs created by <span class="ownername">'+config.ownerName+'</span>'
        };
    
        this.config = {
            ...defaults,
            ...config
        };

        this.config;


    }

    renderTemplate = (data) =>{
    	data = {...this.config,...data};
    	let template =  '<div class="loader-ctr" style="display:block;"><div class="inner">';
    					template +='<h1><span class="ownername">'+data.ownerName+'</span>\'s Gallery</h1>';
						template +='<img class="owner-profile-pic" src="https://node.deso.org/api/v0/get-single-profile-picture/'+data.ownerPublicKey+'"/>';
						template +='<p class="description">'+data.ownerDescription+'</p>';
						template +='<p class="loading-msg">'+data.loadingMsg+'</p>';
						template +='<p class="loading-update">'+data.updateMsg+'</p>';
						template +='<div class="spinner"></div>';
						template +='<div class="social-logo"><img src="/images/logoNFTZ.png"/></div>';						
						template +='</div></div>';
        return template
    }

    displayMsg = (msg) =>{
    	document.querySelector('loading-msg').innerHTML = msg;
    }	

    displayUpdate = (msg) =>{
    	document.querySelector('loading-update').innerHTML = msg;
    }

    render  = (ctrCls) =>{
    	let ctr = document.querySelector(ctrCls);
    	let frag = document.createRange().createContextualFragment(this.renderTemplate());
    	ctr.replaceWith(frag);

    }

    hide = () =>{
       let ls = document.querySelector('.loader-ctr');
        ls.style.display = 'none';
    }

}
export {LoadingScreen}