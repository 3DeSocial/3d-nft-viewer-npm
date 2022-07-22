import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {MeshBVH} from '3d-nft-viewer';
let visualizer, geometries;

export default class SceneryLoader {

    constructor(config){

        let defaults = {
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts',
            castShadow: false,
            sceneryPath: ''
        };
    
        this.config = {
            ...defaults,
            ...config
        };
        
        this.loader = this.config.loader;
        this.scene = this.config.scene;
        this.height = this.config.height;
        this.width = this.config.width;
        this.depth = this.config.depth;


    }

	loadScenery = () =>{
        let that = this;

        return new Promise((resolve, reject) => {
            var that = this;
            this.gltfLoader = new GLTFLoader();

            this.gltfLoader.load(this.config.sceneryPath, (res) => {
                console.log('gltf loaded');
            	that.scaleScene(res.scene);
                console.log('gltf scaled');

                that.centerScene(res.scene);

                console.log('gltf centered');
                that.addScenery(res);
                console.log('collider added');
                resolve(res.scene);
            });
       });
	}

    scaleScene = (scene) =>{
		const gltfScene = scene;
        gltfScene.scale.set(this.config.sceneScale,this.config.sceneScale,this.config.sceneScale);    
        gltfScene.updateMatrixWorld();
    }

    centerScene = (scene) =>{
		const box = new THREE.Box3();
        box.setFromObject( scene );
        box.getCenter( scene.position ).negate();
        scene.updateMatrixWorld( true );
        scene.position.setY(0);
    }

    createCollider = (gltfScene) =>{
        let that = this;
			// visual geometry setup
         // visual geometry setup
            const toMerge = {};
            gltfScene.traverse( c => {

                if ( c.isMesh ) {
                    c.castShadow = that.config.castShadow.;
                    c.receiveShadow = that.config.receiveShadow;
                    const hex = c.material.color.getHex();
                    toMerge[ hex ] = toMerge[ hex ] || [];
                    toMerge[ hex ].push( c );

                }

            } );

            let environment = new THREE.Group();
            for ( const hex in toMerge ) {

                const arr = toMerge[ hex ];
                const visualGeometries = [];
                arr.forEach( mesh => {
                    if( mesh.material.emissive){
                        if ( mesh.material.emissive.r !== 0 ) {

                            environment.attach( mesh );

                        } else {

                            const geom = mesh.geometry.clone();
                            geom.applyMatrix4( mesh.matrixWorld );
                            visualGeometries.push( geom );

                        }
                    } else {
                        const geom = mesh.geometry.clone();
                        geom.applyMatrix4( mesh.matrixWorld );
                        visualGeometries.push( geom );
                    }
                   

                } );

                if ( visualGeometries.length ) {
                    const newGeom = BufferGeometryUtils.mergeBufferGeometries( visualGeometries );
                    const newMesh = new THREE.Mesh( newGeom, new THREE.MeshStandardMaterial( { color: parseInt( hex ), shadowSide: 2 } ) );
                    newMesh.castShadow = that.config.castShadow;
                    newMesh.receiveShadow = config.config.receiveShadow;
                    newMesh.material.shadowSide = 2;

                    environment.add( newMesh );

                }

            }

            // collect all geometries to merge
            const geometries = [];


            environment.updateMatrixWorld( true );
            environment.traverse( c => {

                if ( c.geometry ) {
                    const cloned = c.geometry.clone();
                    cloned.applyMatrix4( c.matrixWorld );
                    for ( const key in cloned.attributes ) {

                        if ( key !== 'position' ) {

                            cloned.deleteAttribute( key );

                        }

                    }

                    geometries.push( cloned );

                }

            } );

            // create the merged geometry
            const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries( geometries, false );
            mergedGeometry.boundsTree = new MeshBVH( mergedGeometry, { lazyGeneration: false } );
            this.bvh = mergedGeometry.boundsTree;
            let collider = new THREE.Mesh( mergedGeometry );
            collider.material.wireframe = true;
            collider.material.opacity = 0;
            collider.material.transparent = true;

        return collider;
     //   visualizer = new MeshBVHVisualizer( collider, params.visualizeDepth );

    }

    addScenery = (gltf) =>{
        const root = gltf.scene;
        this.sceneryMesh = root;
        this.scene.add(root);  
        root.updateMatrixWorld();
        this.scene.updateMatrixWorld();
        this.collider = this.createCollider(root); 
        this.scene.add( this.collider );
        this.collider.updateMatrixWorld();
        this.floorY = this.findFloorLevel(this.collider)   ;
    }
    findFloorLevel = (meshToCheck) =>{
        const invMat = new THREE.Matrix4();

        let origin = new THREE.Vector3(0,100,0);
        let dest = new THREE.Vector3(0,-100,0);
        let dir = new THREE.Vector3();
        dir.subVectors( dest, origin ).normalize();
        let raycaster = new THREE.Raycaster();
        raycaster.ray.applyMatrix4( invMat );
        raycaster.set(origin,dir);
        const hit = this.bvh.raycastFirst( raycaster.ray );
       // hit.point.applyMatrixWorld( this.sceneryMesh.matrixWorld );
                 let planePos = new THREE.Vector3(0,hit.point.y,0);
             //   this.addPlaneAtPos(planePos);
//this.scene.add(new THREE.ArrowHelper( raycaster.ray.direction, raycaster.ray.origin, 200, Math.random() * 0xffffff ));
        return hit.point.y;

    }

    findFloorAt = (pos, ceilHeight, floorHeight) =>{
        
        const invMat = new THREE.Matrix4();
        invMat.copy( this.sceneryMesh.matrixWorld ).invert();

        let origin = pos.clone()
            origin.setY(ceilHeight);

        let dest = pos.clone();
            dest.setY(floorHeight);

            
        let dir = new THREE.Vector3();
        dir.subVectors(dest, origin).normalize();
        let raycaster = new THREE.Raycaster();
        raycaster.ray.applyMatrix4( invMat );
        raycaster.set(origin,dir);
        const hit = this.bvh.raycastFirst( raycaster.ray );
       // this.scene.add(new THREE.ArrowHelper( raycaster.ray.direction, raycaster.ray.origin, ceilHeight, Math.random() * 0xffffff ));

       // hit.point.applyMatrixWorld( this.sceneryMesh.matrixWorld );
       if(hit){
         //   let planePos = new THREE.Vector3(0,hit.point.y,0);
            return hit.point.y;
       } else {
            return false;
        }
             //   this.addPlaneAtPos(planePos);
//this.scene.add(new THREE.ArrowHelper( raycaster.ray.direction, raycaster.ray.origin, 200, Math.random() * 0xffffff ));


    }

    addPlaneAtPos = (posVector) =>{
        var geo = new THREE.PlaneBufferGeometry(20, 20);
        var mat = new THREE.MeshPhongMaterial({ color: 0x99FFFF, side: THREE.DoubleSide });
        var plane = new THREE.Mesh(geo, mat);
        plane.rotateX( - Math.PI / 2);
        plane.position.copy(posVector);
        this.scene.add(plane);

    }

    getFloorY = () =>{
        //reture floor level
        return this.floorY;
    }

}
export {SceneryLoader}