export default class ChainAPI {

    //interface for deso api based on passed config
    constructor(config){
        let defaults = {
              
        };
    
        this.config = {
            ...defaults,
            ...config
        };


    }

    fetchPosts = (params) =>{
        
    }

    fetchPostDetail = (params) =>{

        return new Promise((resolve, reject) => {
                    this.config.fetchPostDetail(params)
                        .then((response) => {
                            response.json().then((nft)=>{
                            resolve(nft);
                        })
                    }).catch(err=>{
                        console.log(err);
                    })
                });
    }
}
export {ChainAPI}