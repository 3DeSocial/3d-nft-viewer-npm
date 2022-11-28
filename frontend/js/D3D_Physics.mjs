import * as THREE from 'three';
import * as CANNON from 'cannon-es';
export default class Physics {

    constructor(config){

        let defaults = {};

        this.config = {
            ...defaults,
            ...config
        };

        this.world = this.config.world;

    }

    addToPhysicsWorld = (opts) =>{
        console.log('Physics addToPhysicsWorld');
        // Get NFT dimensions
        let itemDims = this.measureItem(opts.mesh)
        console.log(itemDims);
        let shape = this.createShape(opts.shape, itemDims);
        console.log('shape');        
        console.log(shape);

        let mat = this.createMat(opts);
        console.log(mat);
        let physBody = this.createBody(opts, shape, mat);
            physBody.position.copy(opts.mesh.position);
            physBody.threeMesh = opts.mesh;

console.log('physBody');
console.log(physBody);
        this.world.addBody(physBody);

    //    physBody.quaternion.setFromEuler(opts.rot.x, opts.rot.y, opts.rot.z);
    
    }

    measureItem = (mesh) =>{
        let bounds =  new THREE.Box3().setFromObject(mesh);
        // Create Physics Shape
        let itemDims = {
            x: Math.abs(bounds.max.x - bounds.min.x),
            y: Math.abs(bounds.max.y - bounds.min.y),
            z: Math.abs(bounds.max.z - bounds.min.z)
        };  

        return itemDims;
    }

    createShape = (type, itemDims) =>{

        switch(type){
            case 'box':
                return new CANNON.Box(new CANNON.Vec3(itemDims.x, itemDims.y, itemDims.z));
            break;
            case 'sphere':
                return new CANNON.Sphere(itemDims.radius);
            break;            
        }
    }

    createMat = (opts) =>{
        let friction = 0.3;
        if(opts.friction){
            friction = opts.friction;
        };

        let restitution = 0.2;
        if(opts.restitution){
            restitution = opts.restitution
        };

        return new CANNON.Material({ friction: friction, restitution: restitution })
    }

    createBody = (opts, shape, mat) =>{
                // Create Physics Body as Cube
        let physBody = new CANNON.Body({
            shape: shape,
            type: opts.bodyType,
            material: opts.mat
        });

        return physBody
    }



}

export {Physics}