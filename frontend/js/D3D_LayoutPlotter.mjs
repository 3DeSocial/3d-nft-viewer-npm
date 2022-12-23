import * as THREE from 'three';

export default class LayoutPlotter  {

    constructor(config) {
        let defaults = {
                 items: [],
                 floorY: -1,
                 ceilY: 8,
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
        if(this.sceneryLoader){
            this.sceneryLoader.loadFloorPlan()
        };

        this.posVector = new THREE.Vector3();

    }


    findFloorAt = (plotPoint, ceilingY, floorY) =>{
        this.posVector.set(plotPoint.x, plotPoint.y, plotPoint.z);
        return this.config.sceneryLoader.findFloorAt(this.posVector, ceilingY, floorY);
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
                this.plotCircles();
            };

           
        }

        if(this.sceneryLoader.hasListLayout()){
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

    plotCircles = (items2d,items3d) =>{
        let that = this;
        let itemsToPlace = items2d;
        
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
            });


        itemsToPlace = items3d;
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
        let lists = this.sceneryLoader.lists;
        let items = this.inventory.getItems2d();
        if(items.length===0){
            console.log('inventory hs no 2d items');
            return;
        };
        console.log('plotList2d: ',lists.length);
        lists.forEach((list,idx)=>{
            let noPos = list.spots.length;
            let noToPlace = (items.length>list.spots.length)?list.spots.length:items.length;
            if(noToPlace>0) {
                for (var i = 0; i <= noToPlace; i++) {
                    let item = items[i];
                    let pos = list.spots[i].pos
                    let rot = list.spots.rot;
                    let dims = list.spots.dims;
                    items[i].pos = pos;
                    let plotPoint = new THREE.Vector3(pos.x,pos.y,pos.z);
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

 plotList3d = () =>{
        this.sceneryLoader.loadFloorPlan(); 
        let lists = this.sceneryLoader.lists;
        let items = this.inventory.getItems3d();
        if(items.length===0){
            console.log('inventory hs no 3d items');
            return;
        };
        console.log('plotList3d: ',lists.length);
        lists.forEach((list,idx)=>{
            let noPos = list.spots.length;
            let noToPlace = (items.length>list.spots.length)?list.spots.length:items.length;
            if(noToPlace>0) {
                for (var i = 0; i <= noToPlace; i++) {
                    let item = items[i];
                    let pos = list.spots[i].pos
                    let rot = list.spots.rot;
                    let dims = list.spots.dims;
                    items[i].pos = pos;
                    let plotPoint = new THREE.Vector3(pos.x,pos.y,pos.z);
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

    getNextFreePos = () =>{

        if(!this.posQ){
            this.initPosQ();
        };
        let spot = this.posQ.shift();
        //console.log('next spot',spot);
        return spot;
      
    }

    getNextFreePos3d = () =>{

        if(!this.posQ){
            this.initPosQ();
        };
        let spot = this.posQ3D.shift();
        return spot;
      
    }

    initPosQ = (opts) =>{
        let that = this;
        this.maxItems = 0;
        this.posQ = [];
        this.posQ3D = [];
        this.defaultDims ={width: 1, height: 1, depth:1};
        if(opts){
            if(opts.defaultDims){
                this.defaultDims = opts.defaultDims;
            }
        }
        this.sceneryLoader.loadFloorPlan(); 
        let lists = (this.sceneryLoader.lists)?this.sceneryLoader.lists:[];
        lists.forEach((list,idx)=>{
            let noPos = list.spots.length;
            list.spots.forEach((spot, idx)=>{
                spot.idx = idx;
                that.posQ.push(spot); 
            })
        }); 

        let circles = (this.sceneryLoader.circles)?this.sceneryLoader.circles:[];
        console.log('circles 2d: ',circles);

            circles.forEach((circle,idx)=>{
                  if(circle.name!='snowmen'){
                    //console.log('initPosQ circle.yOffset',circle.yOffset);
                    circle.center = {x:0,y:0,z:0};
                    if(idx % 2){
                        circle.spots = this.calcCircleSpots(circle); // get list of spots
                     } else {
                        circle.spots = this.calcCircleSpotsOffset(circle); // get list of spots
                    };

                    let noPos = circle.spots.length;
                    circle.spots.forEach((spot, idx)=>{

                        spot.rot = null; // look at center for circel layout
                        spot.layoutType = 'circle';
                        if(circle.yOffset){
                            spot.pos.y = spot.pos.y + circle.yOffset;
                        }

                        spot.dims = that.defaultDims;
                        if(circle.width){
                            console.log('circl3 2d widthL '+circle.width)

                            spot.dims.width = circle.width;
                        } else {
                            console.log('circl3 2d has no width')
                        }
                        if(circle.height){
                            spot.dims.height = circle.height;
                        };
                        if(circle.depth){
                            spot.dims.depth = circle.depth;
                        }; 
                        spot.idx = idx;

                        that.posQ.push(spot); 
                    
                    })                    
                } else {
                    console.log('skip snowmen')
                }
               
            }); 
        let circles3d = (this.sceneryLoader.circles3d)?this.sceneryLoader.circles3d:[];

                    console.log('circles 3D: ',circles3d);

            circles3d.forEach((circle,idx)=>{
                console.log('circles3d: ', circle)
                if(circle.name!='snowmen'){
                    //console.log('initPosQ circle.yOffset',circle.yOffset);
                    circle.center = {x:0,y:0,z:0};
                    if(idx % 2){
                        circle.spots = this.calcCircleSpots(circle); // get list of spots
                     } else {
                        circle.spots = this.calcCircleSpotsOffset(circle); // get list of spots
                    };

                    let noPos = circle.spots.length;
                    circle.spots.forEach((spot, idx)=>{
                        spot.rot = null; // look at center for circel layout
                        spot.layoutType = 'circle';
                        if(circle.yOffset){
                            spot.pos.y = spot.pos.y + circle.yOffset;
                        }

                        spot.dims = that.defaultDims;
                        if(circle.width){
                            console.log('circl3 3d widthL '+circle.width)

                            spot.dims.width = circle.width;
                        } else {
                            console.log('circl3 3d has no width')
                        }
                        if(circle.height){
                            spot.dims.height = circle.height;
                        };
                        if(circle.depth){
                            spot.dims.depth = circle.depth;
                        }; 
                        spot.idx = idx;

                        that.posQ3D.push(spot); 
                    })                    
                } else {
                    console.log('skip snowmen')
                }
               
               
            });
        let lists3d = (this.sceneryLoader.lists3d)?this.sceneryLoader.lists3d:[];

       lists3d.forEach((list,idx)=>{
            let noPos = list.spots.length;
            list.spots.forEach((spot, idx)=>{
                spot.idx = idx;
                that.posQ3D.push(spot); 
            })
        });

        this.maxItems =this.posQ.length+this.posQ3D.length;
        return this.maxItems;
    }

    getMaxItemCount = () =>{
        if(!this.posQ){
            this.initPosQ();
        };
        return this.posQ.length;
    }

    getMaxItemCount3D = () =>{
        if(!this.posQ){
            this.initPosQ();
        };
        return this.posQ3D.length;
    }

    calcCircleSpots = (circle) =>{
        //        {id:7, pos:{x: 7.6974523925781275, y: -0.5, z: 11.73381267645709}, dims:{width:1.5, height: 3}, rot:{x:0,y:1.57079632679,z:0}},
        console.log('calcCircleSpots');

        console.log(circle);
        let noItems = circle.maxItems*2; // use double positions then spit into 2 for offet
        let center = circle.center;
        let radius = circle.radius;
        let spots = [];
        let positions = [];

        for (var i = noItems - 1; i >= 0; i--) {
            if(i % 2){
                let spot = {idx:i};
                let angle = ((2*Math.PI) / noItems) * i;
                let xCoord = Math.sin(angle) * radius;
                let zCoord = Math.cos(angle) * radius;
                let plotPoint = new THREE.Vector3(xCoord,0,zCoord);
                // find floor or surface at this coord in the scenery
              //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
                let floor = this.config.sceneryLoader.findFloorAt(plotPoint, this.config.ceilY, this.config.floorY);
                // set Y for new position
                if (circle.yOffset) {
                    floor = floor+circle.yOffset;
                };
                    let pos = {x:xCoord,y:floor,z:zCoord};
                        spot.pos = pos;
                        spot.dims = {width:circle.width, height: circle.height, depth: circle.depth};

                        spot.target = center;
                    spots.push(spot);
            }


        }

        return spots;
    }

    calcCircleSpotsOffset = (circle) =>{
        //        {id:7, pos:{x: 7.6974523925781275, y: -0.5, z: 11.73381267645709}, dims:{width:1.5, height: 3}, rot:{x:0,y:1.57079632679,z:0}},

        let noItems = circle.maxItems*2; // use double positions then spit into 2 for offet
        let center = circle.center;
        let radius = circle.radius;
        let spots = [];
        let positions = [];

        for (var i = noItems - 1; i >= 0; i--) {
            if(!(i % 2)){
            let spot = {idx:i};
            let angle = ((2*Math.PI) / noItems) * i;
            let xCoord = Math.sin(angle) * radius;
            let zCoord = Math.cos(angle) * radius;
            let plotPoint = new THREE.Vector3(xCoord,0,zCoord);
            // find floor or surface at this coord in the scenery
          //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
            let floor = this.config.sceneryLoader.findFloorAt(plotPoint, this.config.ceilY, this.config.floorY);
            // set Y for new position
            //plotPoint.setY(floor);
                if(circle.yOffset){
                    floor = floor+circle.yOffset;
                };
                
                let pos = {x:xCoord,y:floor,z:zCoord};

                    spot.pos = pos;
                    spot.dims = {width:circle.width, height: circle.height, depth: circle.depth};
                    spot.target = center;
                spots.push(spot);
            }

        }

        return spots;
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