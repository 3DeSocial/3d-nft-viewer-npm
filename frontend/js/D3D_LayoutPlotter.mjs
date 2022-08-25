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

    }

    plotFromArray = (items) =>{
        let noItems = items.length;
       // console.log('plotFromArray: ',items);

        for (var i = noItems - 1; i >= 0; i--) {
            let item = items[i];
            let plotPoint = new THREE.Vector3(item.config.position.x,item.config.position.y,item.config.position.z);
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
console.log('floor',floor);;
            // set Y for new position
            plotPoint.setY(floor);
                let target = center;
                target.y = floor;
                //console.log('items[i]',items[i]);
                positions.push({nftHex:items[i].config.nftPostHashHex, plotPoint, target: target});
                let thisItem = items[i];
                this.plotItem(thisItem,plotPoint).then((item)=>{
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

plotCircleOffsetHalf = (items, center, radius) =>{
        //first position
        let noItems = items.length*2;
        let positions = [];
        let itemIdx = 0;
        for (var i = noItems - 1; i >= 0; i--) {
            if((i % 2)){

            let angle = ((2*Math.PI) / noItems) * i;
            let xCoord = Math.sin(angle) * radius;
            let zCoord = Math.cos(angle) * radius;
            let plotPoint = new THREE.Vector3(xCoord,0,zCoord);
            // find floor or surface at this coord in the scenery
          //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
            let floor = this.config.sceneryLoader.findFloorAt(plotPoint, 8, -1);
console.log('floor',floor);;
            // set Y for new position
            plotPoint.setY(floor);
                let target = center;
                target.y = floor;
                console.log('items[',itemIdx,']',items[itemIdx]);
                positions.push({nftHex:items[itemIdx].config.nftPostHashHex, plotPoint, target: target});
                let thisItem = items[itemIdx];
                this.plotItem(thisItem,plotPoint).then((item)=>{
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

}

export {LayoutPlotter}