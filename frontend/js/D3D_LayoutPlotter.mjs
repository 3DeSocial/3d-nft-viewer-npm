import * as THREE from 'three';

export default class LayoutPlotter  {

    constructor(config) {
        let defaults = {
                 items: [],
                 floorY: 0
                };
        
        this.config = {
            ...defaults,
            ...config
        };      

        this.plotPoint = new THREE.Vector3();

    }

    plotFromArray = (items, positions) =>{
        let noItems = items.length;
       // console.log('plotFromArray: ',items);

        for (var i = noItems - 1; i >= 0; i--) {
            let item = items[i];
            let pos = positions[i];
            let plotPoint = new THREE.Vector3(pos.x,pos.y,pos.z);
            let floor = this.config.sceneryLoader.findFloorAt(plotPoint, 2, -1);
            this.plotItem(item,plotPoint).then((model)=>{
                model.rotation.x = 0;
                model.rotation.y = item.config.rotation.y;
                model.rotation.z = item.config.rotation.z;
            })
        }
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