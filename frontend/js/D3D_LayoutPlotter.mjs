import * as THREE from 'three';

export default class LayoutPlotter  {

    constructor(config) {
        let defaults = {
                 items: [],
                 floorY: 0,
                 inventory: null,
                 sceneryLoader: null
                };
        
        this.config = {
            ...defaults,
            ...config
        };      

        this.plotPoint = new THREE.Vector3();
        this.inventory = this.config.inventory;
        this.sceneryLoader = this.config.sceneryLoader;
    }



    placeSceneAssets = () =>{
        let itemsToPlace = this.sceneInventory.getItems();
            this.floorY = this.sceneryLoader.getFloorY(); // floor height at starting point
            this.layoutPlotter = new LayoutPlotter({items:itemsToPlace, 
                                                floorY: this.floorY,
                                                sceneryLoader: this.sceneryLoader,
                                                camera: this.camera});


            this.layoutPlotter.plotFromArray(itemsToPlace);

    }

    placeUserAssets = () =>{
        if(this.inventory.has2d()&&(this.inventory.has3d())){
            console.log('plotting 2D')
            //create outer circle layut for 2D
            if(this.sceneryLoader.hasCircleLayout()){
                console.log('HAS circle layout');
                this.plotCircles();
            };

           
        }

        if(this.sceneryLoader.hasListLayout()){
            console.log('list layout detected');
            this.plotList2d();
        } else {
            console.log('no list layout');
        };
     /*   if(this.inventory.has3d()){
            console.log('plotting 3D')

            //create outer circle layut for 2D
             if(this.sceneryLoader.hasCircleLayout()){
                console.log('HAS circle layout');
             //   this.plotCircle3d();
            } else{
                console.log('no circle layout');
            }
        } else {
            console.log('user has no 3D');
        }  */
       
    }

    plotCircles = () =>{
        let that = this;
        let itemsToPlace = this.inventory.getItems2d();
        
        let center = this.sceneryLoader.config.center;
        const objectComparisonCallback = (arrayItemA, arrayItemB) => {
              if (arrayItemA.maxItems > arrayItemB.maxItems) {
                return -1
              }

              if (arrayItemA.maxItems < arrayItemB.maxItems) {
                return 1
              }
              return 0;
        }

        let circles2d =this.sceneryLoader.circles.sort(objectComparisonCallback);
        let circle3d = circles2d.pop(); //use inner most for 3d

            circles2d.forEach((circle, idx)=>{

                let items = itemsToPlace.splice(0,circle.maxItems);
                console.log('plottin ',items.length,' in circle: ',idx);
                console.log(items);
                if((idx % 2)){
                    that.plotCircle(items,center,circle.radius);
                } else {
                    that.plotCircleOffsetHalf(items,center,circle.radius);
                };
                console.log('plotted circle: ',idx);

            });


        itemsToPlace = this.inventory.getItems3d();
        let items = itemsToPlace.splice(0,circle3d.maxItems);
            this.plotCircle3d(center,circle3d.radius);

        let centerPiece = this.inventory.getItemWithFilter((item)=>{
            if(item.config.layout){
                return (item.config.layout==='centerPiece');
            } else {
                return false;
            }
        });

        if(centerPiece[0]){
            centerPiece[0].place(center);
        }

    }

    plotCircle2d = (itemsToPlace) => {
        if(!itemsToPlace){
            itemsToPlace = this.inventory.getItems2d();
        };
        this.floorY = this.sceneryLoader.getFloorY(); // floor height at starting point
        
            let radius = this.sceneryLoader.config.layouts.circle.radius;
            let center = new THREE.Vector3(0,0,0);
            this.layoutPlotter.plotCircle(itemsToPlace, center,radius);
    }

    plotCircle3d  = (itemsToPlace, center,radius) => {
        this.plotCircle(itemsToPlace, center,radius);         
       // this.layoutPlotter.plotCircleWithDivders(itemsToPlace, center,radius,true);         
    }    

    plotList2d = () =>{
        this.sceneryLoader.loadFloorPlan(); 
        let lists = this.sceneryLoader.lists;
        let items = this.inventory.getItems2d();
        console.log('plotList2d: ',lists.length);
        lists.forEach((list,idx)=>{
            console.log(list);
            let noPos = list.spots.length;
            console.log('noPos: ',noPos);
            let noToPlace = (items.length>list.spots.length)?list.spots.length:items.length;
            console.log('noToPlace: ',noToPlace); 
            if(noToPlace>0) {
                for (var i = 0; i <= noToPlace; i++) {
                    let item = items[i];
                    let pos = list.spots[i].pos
                    let rot = list.spots.rot;
                    let dims = list.spots.dims;
                    items[i].pos = pos;
                    let plotPoint = new THREE.Vector3(pos.x,pos.y,pos.z);
                    let floor = this.config.sceneryLoader.findFloorAt(plotPoint, 2, -1);
                   /* if(pos.maxHeight){
                        item.setDimensions(dims.width, dims.height, 0.1);
                        item.scaleToFitScene(item.mesh, pos);
                    };*/

                    item.spot = list.spots[i];
                    item.spot.idx = i;
                    this.plotItem(item,plotPoint).then((item)=>{
                        if(item.spot.rot){
                            item.mesh.rotateY(item.spot.rot.y);
                        }       

                    })
                }
            };

        });
    }

    plotCircle = (items, center, radius) =>{
        //first position
        let noItems = items.length;
        let positions = [];
        for (var i = noItems - 1; i >= 0; i--) {
            let angle = ((2*Math.PI) / noItems) * i;
            let xCoord = Math.sin(angle) * radius;
            let zCoord = Math.cos(angle) * radius;
            let plotPoint = new THREE.Vector3(xCoord,0,zCoord);
            // find floor or surface at this coord in the scenery
          //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
            let floor = this.config.sceneryLoader.findFloorAt(plotPoint, 8, -1);
            // set Y for new position
            plotPoint.setY(floor);
                let target = center;
                target.y = floor;
                //console.log('items[i]',items[i]);
                positions.push({nftHex:items[i].config.nftPostHashHex, plotPoint: plotPoint, target: target});
                let thisItem = items[i];
                this.plotItem(thisItem,plotPoint).then((item)=>{
                    console.log('plotting ',i,' / ',noItems);
                   // console.log(item);
                   // console.log('plotted position Y',item.mesh.position.y);
                    let lookAtTarget = center.clone();

                    if(item.isImage){
                        lookAtTarget.y = item.mesh.position.y;
                        item.mesh.lookAt(lookAtTarget);
                    } else {
                        item.mesh.rotation.y = Math.atan2( ( center.x - center.x ), ( center.z - center.z ) );
                    }


                })
        }

        this.circlePositions = positions;
    }

    plotCircleWithDivders = (items, center, radius) =>{
        //first position
        let noItems = items.length*2;
        let positions = [];
        let itemIdx = 0;
        let wallHeight = items[0].config.height;
        let wallWidth = items[0].config.width;
        for (var i = noItems - 1; i >= 0; i--) {
            this.calcPointOnCircle(i, noItems, radius);
            if((i % 2)){
                console.log('plot 3d nft')

                // find floor or surface at this coord in the scenery
                //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
                let floor = this.config.sceneryLoader.findFloorAt(this.plotPoint, 8, -1);
                // set Y for new position
                this.plotPoint.setY(floor);
                let target = center;
                target.y = floor;
                console.log('items[',itemIdx,']',items[itemIdx]);
                positions.push({nftHex:items[itemIdx].config.nftPostHashHex, plotPoint: this.plotPoint.clone(), target: target});
                let thisItem = items[itemIdx];
                this.plotItem(thisItem,this.plotPoint).then((item)=>{
                   // console.log(item);
                   // console.log('plotted position Y',item.mesh.position.y);
                    let lookAtTarget = center.clone();
                    if(item.isImage){
                        lookAtTarget.y = item.mesh.position.y;
                        item.mesh.lookAt(lookAtTarget);
                    } else {
                        item.mesh.rotation.y = Math.atan2( ( center.x - center.x ), ( center.z - center.z ) );
                    }
                })
                ++itemIdx;                
            } else {
                console.log('create dividers')
                let wall = this.createWall(radius,20);
                console.log(wall);
                console.log(this.plotPoint);
                    wall.position.copy(this.plotPoint);
                    wall.rotateY(Math.PI/2)
                    this.config.scene.add(wall);
            }

            this.circlePositions = positions;

        };     // loop end   
    }

    calcPointOnCircle = (i, noItems, radius) =>{
        let angle = ((2*Math.PI) / noItems) * i;
        let xCoord = Math.sin(angle) * radius;
        let zCoord = Math.cos(angle) * radius;
        this.plotPoint.set(xCoord,0,zCoord);
    }

    createWall = (width, height,depth) =>{
        if(!depth){
            depth = 0.10;
        };

        const geometry = new THREE.BoxGeometry( width, height, depth );
        const materials = this.createMats();
        return new THREE.Mesh( geometry, materials );
    }
    
    plotCircleOffsetHalf = (items, center, radius) =>{
        //first position
        let noItems = items.length*2;
        let positions = [];
        let itemIdx = 0;
        for (var i = noItems - 1; i >= 0; i--) {
            this.calcPointOnCircle(i, noItems, radius);

            if((i % 2)){

                // find floor or surface at this coord in the scenery
                //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
                let floor = this.config.sceneryLoader.findFloorAt(this.plotPoint, 8, -1);
                // set Y for new position
                this.plotPoint.setY(floor);
                let target = center;
                target.y = floor;
                positions.push({nftHex:items[itemIdx].config.nftPostHashHex, plotPoint: this.plotPoint.clone(), target: target});
                let thisItem = items[itemIdx];
                this.plotItem(thisItem,this.plotPoint).then((item)=>{
                   // console.log(item);
                   // console.log('plotted position Y',item.mesh.position.y);
                    let lookAtTarget = center.clone();
                    if(item.isImage){
                        lookAtTarget.y = item.mesh.position.y;
                        item.mesh.lookAt(lookAtTarget);
                    } else {
                        item.mesh.rotation.y = Math.atan2( ( center.x - center.x ), ( center.z - center.z ) );
                    };

                })
                ++itemIdx;                
            }

            this.circlePositions = positions;

        };        
    }    

    plotRow = (items, startPos, endPos) =>{

    }    

    plotItem = (item, plotPoint) =>{
        return new Promise(( resolve, reject ) => {
            item.place(plotPoint).then((model, pos)=>{

                resolve(item);
            });
        });      
    }

    createMats = () =>{
        var topside = new THREE.MeshBasicMaterial({color: '#AAAAAA'});
        var bottomside = new THREE.MeshBasicMaterial({color: '#AAAAAA'});        
        var leftside = new THREE.MeshBasicMaterial({color: '#AAAAAA'}); 
        var rightside = new THREE.MeshBasicMaterial({color: '#AAAAAA'});
        var backside = new THREE.MeshBasicMaterial( { color: '#AAAAAA' } );
        var frontside = new THREE.MeshBasicMaterial( { color: '#AAAAAA' } );

        var materials = [
          rightside,          // Right side
          leftside,          // Left side
          topside, // Top side
          bottomside, // Bottom side
          backside,            // Back side
          frontside          // Front side          
        ];

        return materials;
    }
}

export {LayoutPlotter}