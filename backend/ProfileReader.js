'use strict';
var axios = require('axios');

class DeSoProfileReader {
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

  fetchProfile(publicKey) {

    const payload = {
        PublicKeysBase58Check: [publicKey]
    };

    const payloadJson = JSON.stringify(payload);
    return this.desoNodeClient.post('get-users-stateless', payloadJson, {
              headers: {
                    // Overwrite Axios's automatically set Content-Type
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
          });
    }
 
};
module.exports = new DeSoProfileReader();