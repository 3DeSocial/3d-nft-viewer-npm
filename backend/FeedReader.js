'use strict';
var axios = require('axios');

class FeedReader {
  constructor() {
    this.initDeSoClient();
  }
 
  initDeSoClient(){

    this.desoNodeClient = axios.create({
      baseURL: 'https://node.deso.org/api/v0/',
      withCredentials: false,
      headers: {
                  // Overwrite Axios's automatically set Content-Type
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
              }
    });  

    /*
     * Add a response interceptor
     */
    this.desoNodeClient.interceptors.response.use(
        (response) => {
            return response;
        },
        function (error) {
            console.log(error);
            return Promise.reject(error);
        }
    );
  }

  fetchNFTFeed(publicKey) {

    const payload = {
        ReaderPublicKeyBase58Check: 'BC1YLh3GazkEWDVqMtCGv6gbU79HcMb1LKAgbYKiMzUoGDEsnnBSiw7',
        UserPublicKeyBase58Check: publicKey
    };

    const payloadJson = JSON.stringify(payload);
    return this.desoNodeClient.post('get-nfts-for-user', payloadJson, {
              headers: {
                    // Overwrite Axios's automatically set Content-Type
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
          });
    }
 
};
module.exports = FeedReader;