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
            castShadow: true,
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

                console.log('collider added');
                resolve(res);
            });
       });
	}

    scaleScene = (scene) =>{
		const gltfScene = scene;
        gltfScene.scale.set(0.2,0.2,0.2);    
    }

    centerScene = (scene) =>{
		const box = new THREE.Box3();
        box.setFromObject( scene );
        box.getCenter( scene.position ).negate();
        scene.updateMatrixWorld( true );        
    }

    createCollider = (gltfScene) =>{
			// visual geometry setup
        const toMerge = {};
        gltfScene.traverse( c => {

            if ( c.isMesh ) {
                console.log('mesh found');
                c.castShadow = false;
                c.receiveShadow = true;
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

                if ( mesh.material.emissive.r !== 0 ) {

                    environment.attach( mesh );

                } else {

                    const geom = mesh.geometry.clone();
                    geom.applyMatrix4( mesh.matrixWorld );
                    visualGeometries.push( geom );

                }

            } );

            if ( visualGeometries.length ) {

                const newGeom = BufferGeometryUtils.mergeBufferGeometries( visualGeometries );
                const newMesh = new THREE.Mesh( newGeom, new THREE.MeshStandardMaterial( { color: parseInt( hex ), shadowSide: 2 } ) );
                newMesh.castShadow = true;
                newMesh.receiveShadow = true;
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

        let collider = new THREE.Mesh( mergedGeometry );
            collider.material.wireframe = false;
            collider.material.opacity = 0.5;
            collider.material.transparent = true;
        return collider;
     //   visualizer = new MeshBVHVisualizer( collider, params.visualizeDepth );

    }

}
export {SceneryLoader}