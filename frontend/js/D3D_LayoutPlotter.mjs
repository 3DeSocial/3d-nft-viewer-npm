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


    plotCircle = (items, center, radius) =>{
        //first position
        let noItems = items.length;
        for (var i = noItems - 1; i >= 0; i--) {
            let angle = ((2*Math.PI) / noItems) * i;
            let xCoord = Math.sin(angle) * radius;
            let zCoord = Math.cos(angle) * radius;
            let plotPoint = new THREE.Vector3(xCoord,0,zCoord);
            // find floor or surface at this coord in the scenery
          //  let ceil = this.config.sceneryLoader.findFloorAt(plotPoint, 10, 0);
            let floor = this.config.sceneryLoader.findFloorAt(plotPoint, 2, -1);

            // set Y for new position
            plotPoint.setY(floor);
            this.plotItem(items[i],plotPoint)
                .then((model)=>{
                    model.lookAt(center);
                })
        }
    }

    plotRow = (items, startPos, endPos) =>{

    }    

    plotItem = (item, plotPoint) =>{
        return new Promise(( resolve, reject ) => {
            item.place(plotPoint).then((model, pos)=>{
                console.log('placed');
                resolve(model);
            });
        });      
    }

}

export {LayoutPlotter}