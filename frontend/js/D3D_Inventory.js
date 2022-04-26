export const name = 'd3d-space-viewer';
let THREE, GLTFLoader, OrbitControls, XRControllerModelFactory, VRButton;

class Item {

    constructor(config){
        let defaults = {
            modelUrl: '',
            modelsRoute: 'models'
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        
        THREE = this.config.three;
        this.gltfLoader = this.config.gltfLoader;
        this.scene = this.config.scene;
        this.height = this.config.height;
        this.width = this.config.width;
        this.depth = this.config.depth;
        this.modelURL = this.config.modelURL

    }

    place = (pos) =>{

        let that = this;

        this.fetchModelURL()
            .then((modelURL)=>{
                console.log('placing item: ',modelURL)
                this.fetchModel(modelURL)
                .then((model)=>{

                    this.mesh = model;

                  //  that.setScale(model);

                 //   that.rotateItem();
                    that.addToScene(model);
                    that.positionItem(model, pos);

                })
            });
    }

    centerMeshInScene = (gltfScene) =>{
        let firstMesh = null;

        if(gltfScene.children.length === 1){
            firstMesh = gltfScene.children[0];
            firstMesh.geometry.center();
            return firstMesh;            
        } else {
            gltfScene.traverse( c => {

                if ( c.isMesh ) {

                    firstMesh = c;
                    firstMesh.geometry.center();
                    return firstMesh;  
                }

            } );
        }


    }
    
    fetchModelURL = async() =>{
        let that = this;

        return new Promise((resolve,reject)=>{
            // fetch from config if available
            if(this.config.modelURL!==''){
                console.log('returning config url: ',this.config.modelURL);
                resolve(this.config.modelURL);
            } else {
                let url = '/nfts/'+that.config.nftPostHashHex;
                    console.log('fetchModelURL from: '+url);

                fetch(url,{ method: "post"})
                .then(response => response.json())
                .then((data)=>{ 

                    if(data !== undefined){
                        let fullUrl = '/'+that.config.modelsRoute+'/'+that.config.nftPostHashHex+data.modelUrl;
                        console.log('returning fetched url: ',this.config.modelURL);
                        resolve(fullUrl);
                    } else {
                        reject();
                    }
                });
            }
        })
        
    }

    fetchModel = async(modelURL) =>{
        
        let that = this;

        return new Promise((resolve,reject)=>{

            console.log('create container:',that.config.width, that.config.height,that.config.depth);
            const geometry = new THREE.BoxGeometry(that.config.width, that.config.height,that.config.depth);
            
            if(!that.config.color){
                that.config.color = 0xfffff;
            };
            
            const material = new THREE.MeshPhongMaterial({
                color: that.config.color,
                opacity: 0,
                transparent: true
            });

            let boxMesh = new THREE.Mesh( geometry, material );
            this.scene.add(boxMesh);
            let sceneBounds = new THREE.Box3().setFromObject( boxMesh );
            let meshBounds = null;

            that.gltfLoader.load(modelURL, (model)=> {

                let gltfMesh = null;

                gltfMesh = model.scene;

                if(that.shouldBeCentered(model.scene.children)){
                    let h = that.getImportedObjectSize(model.scene);
                    let heightOffset = h/2;                    
                    model.scene.children[0].position.setX(0);
                    model.scene.children[0].position.setZ(0);
                    model.scene.children[0].position.setY(heightOffset);                       
                    that.centerMeshInScene(model.scene);                
                };

                let meshBounds = new THREE.Box3().setFromObject( gltfMesh );


                // Calculate side lengths of scene (cube) bounding box
                let lengthSceneBounds = {
                  x: Math.abs(sceneBounds.max.x - sceneBounds.min.x),
                  y: Math.abs(sceneBounds.max.y - sceneBounds.min.y),
                  z: Math.abs(sceneBounds.max.z - sceneBounds.min.z),
                };   

                // Calculate side lengths of glb-model bounding box
                let lengthMeshBounds = {
                  x: Math.abs(meshBounds.max.x - meshBounds.min.x),
                  y: Math.abs(meshBounds.max.y - meshBounds.min.y),
                  z: Math.abs(meshBounds.max.z - meshBounds.min.z),
                };

                // Calculate length ratios
                let lengthRatios = [
                  (lengthSceneBounds.x / lengthMeshBounds.x),
                  (lengthSceneBounds.y / lengthMeshBounds.y),
                  (lengthSceneBounds.z / lengthMeshBounds.z),
                ];

                let minRatio = Math.min(...lengthRatios);
                boxMesh.add(gltfMesh);
                // Use smallest ratio to scale the model
                gltfMesh.scale.set(minRatio, minRatio, minRatio);
                gltfMesh.position.set(0,0,0);        
                resolve(boxMesh);
            });

        })
      
    }

    shouldBeCentered = (children) =>{

        if(children.length>1){
            return false;// dont center      
        };        
    
        if(!children[0].isMesh){
            return false; // dont center         
        };
        let mesh = children[0];
        if(mesh.position.x!=0){
            return true;
        };
    
        if(mesh.position.z!=0){
            return true;
        };

        return false;
    }

    getImportedObjectSize = (obj) =>{
        let box = new THREE.Box3().setFromObject(obj);
        let center = new THREE.Vector3();
        let size = new THREE.Vector3();
        let max = box.max;
        let min = box.min;
        let d = max.z - min.z;
        let w = max.x - min.x;
        let h = max.y - min.y;

        return h;
    }

    setScale = (model) =>{

        //create a box which is the desired size of the nft

        let lengthSceneBounds = {
          x: 2,
          y: 2,
          z: 2,
        };

        let meshBounds = this.getMeshBounds(model);
        
        let lengthMeshBounds = {
          x: Math.abs(meshBounds.max.x - meshBounds.min.x),
          y: Math.abs(meshBounds.max.y - meshBounds.min.y),
          z: Math.abs(meshBounds.max.z - meshBounds.min.z),
        }

        let lengthRatios = [
          (lengthSceneBounds.x / lengthMeshBounds.x),
          (lengthSceneBounds.y / lengthMeshBounds.y),
          (lengthSceneBounds.z / lengthMeshBounds.z),
        ];
        
        let minRatio = Math.min(...lengthRatios);

        model.scale.set(minRatio, minRatio, minRatio);

    }

    getMeshBounds = (model) => {
        let that = this;
        let meshBounds = null;

        model.traverse( function ( child ) {
            if ( child.isMesh ) {
                child.geometry.computeBoundingBox()
                meshBounds = child.geometry.boundingBox;
                console.log(meshBounds);
            }
        });
        return meshBounds;
    }

    positionItem = (model, posVector) =>{
        model.position.copy(posVector);
    }

    rotateItem = () =>{

    }

    addToScene = (model) =>{
        this.scene.add(model);
    }

}

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
        this.gltfLoader = this.config.gltfLoader;

        this.items = [];

        this.load();
      
    }

    load = () =>{
        this.initItems(this.config.items);
    }

    initItems = (itemList)=>{

        let that = this;
        console.log('initItems');
        console.log(itemList);
        itemList.forEach((itemData)=>{
            itemData.three = THREE;
            itemData.scene = this.scene;
            itemData.gltfLoader = this.gltfLoader;
            let item = new Item(itemData);
            that.items.push(item);

        })
    }

    getItems = () =>{
        return this.items;
    }


 }
export {D3DInventory, Item};