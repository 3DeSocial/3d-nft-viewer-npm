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
        // Get NFT dimensions
        let itemDims = this.measureItem(opts.mesh)
        let physBodyCap = this.createCapsule(opts, itemDims);
            this.world.addBody(physBodyCap);   
            return physBodyCap;
    }

    createCube = (opts, itemDims) =>{
        let shape = this.createShape(opts.shape, itemDims);


        let mat = this.createMat(opts);

        let physBody = this.createBody(opts, shape, mat);
            physBody.position.copy(opts.mesh.position);
            physBody.threeMesh = opts.mesh;
        return physBody;
    }

    createCapsule = (opts, itemDims) =>{
        let sphereShape = this.createShape('sphere', itemDims.x/4);

        let sphere = {shape: sphereShape,
                    offset: new CANNON.Vec3(0, itemDims.y/2, 0)}

        let sphereShape2 = this.createShape('sphere', itemDims.x);

        let sphere2 = {shape: sphereShape2,
                    offset: new CANNON.Vec3(0, itemDims.y/2, 0)}                    

        let mat = this.createMat(opts);

        let physBody = this.createBody(opts, [sphere2,sphere], mat);
            physBody.position.copy(opts.mesh.position);

         /* let sphereVisMesh1 = this.visualizeSphere(itemDims.x/4);
           sphereVisMesh1.position.copy(opts.mesh.position);
            sphereVisMesh1.position.y = sphereVisMesh1.position.y + itemDims.y - itemDims.y/4;

            let sphereVisMesh2 = this.visualizeSphere(itemDims.x/4);
            sphereVisMesh2.position.copy(opts.mesh.position);
            sphereVisMesh2.position.y = sphereVisMesh2.position.y + itemDims.y/4;
            console.log('vis at: ',opts.mesh.position);*/
        return physBody;
    }

    visualizeSphere = (radius) =>{
        
        const geometry = new THREE.SphereGeometry( radius, 32, 16 );
        const material = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
        const sphere = new THREE.Mesh( geometry, material );
        this.config.scene.add( sphere );        
        return sphere;
    }



    measureItem = (mesh) =>{
        let bounds =  new THREE.Box3().setFromObject(mesh);
        // Create Physics Shape
        let itemDims = {
            x: Math.abs(bounds.max.x - bounds.min.x),
            y: Math.abs(bounds.max.y - bounds.min.y),
            z: Math.abs(bounds.max.z - bounds.min.z),
            bounds
        };  

        return itemDims;
    }

    createShape = (type, itemDims) =>{

        switch(type){
            case 'box':
                return new CANNON.Box(new CANNON.Vec3(itemDims.x, itemDims.y, itemDims.z));
            break;
            case 'sphere':
                return new CANNON.Sphere(itemDims.x);
            break;
            case 'cylinder':
                return new CANNON.Cylinder(itemDims.x, itemDims.x, itemDims.y, 12);
            break
        }
    }

    createMat = (opts) =>{
        let friction = 0.1;
        if(opts.friction){
            friction = opts.friction;
        };

        let restitution = 1;
        if(opts.restitution){
            restitution = opts.restitution
        };

        return new CANNON.Material({ friction: friction, restitution: restitution })
    }

    createBody = (opts, shapes, mat) =>{
                // Create Physics Body as Cube
        let physBody = new CANNON.Body({
            type: opts.bodyType,
            material: opts.mat
        });

        shapes.forEach((shapeData)=>{
            let offset = (shapeData.offset)?shapeData.offset:null;
            let quat =  (shapeData.quat)?shapeData.quat:null;;
            physBody.addShape(shapeData.shape,offset,quat);
        });
        return physBody
    }



}

export {Physics}