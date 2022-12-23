import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, MeshBVHVisualizer } from '3d-nft-viewer';
let visualizer, geometries;

export default class SceneryLoader {

    constructor(config){

        let defaults = {
            hasCircleLayout: false,
            modelUrl: '',
            modelsRoute: 'models',
            nftsRoute: 'nfts',
            castShadow: false,
            receiveShadow: false,
            sceneryPath: '',
            center: new THREE.Vector3(0,0,0)
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
        this.circles3d = [];
        this.lists3d = [];
        this.circles = [];        
        this.centerPiece = [];
        if(this.config.playerStartPos){
            this.playerStartPos = this.config.playerStartPos;
        } else {
            this.playerStartPos = this.config.center;
        }
        if(this.config.floorPlan){
            this.loadFloorPlan();          
        };
    }

    hasCircleLayout = () =>{
        if(!this.config.floorPlan){
            return false;
        }
        let circles =  this.config.floorPlan.filter(plan => plan.type == 'circle');
        return (circles.length>1);
    }

    hasListLayout = () =>{
        if(!this.config.floorPlan){
            return false;
        }

        let lists =  this.config.floorPlan.filter(plan => plan.type == 'list');
        return (lists.length>0);
    }

    loadFloorPlan = () =>{

        this.circles =  this.config.floorPlan.filter(plan => (plan.type == 'circle')&&(plan.name !='snowmen'))
        this.centerPiece = this.config.floorPlan.filter(plan => plan.type == 'centerPiece');
        this.rows = this.config.floorPlan.filter(plan => plan.type == 'rows');
        this.lists =  this.config.floorPlan.filter(plan => plan.type == 'list');
        this.lists3d =  this.config.floorPlan.filter(plan => (plan.type == 'list3d')&&(plan.name !='snowmen'))
        this.circles3d =  this.config.floorPlan.filter(plan => (plan.type == 'circle3d')&&(plan.name !='snowmen'));     
        this.snowmen =  this.config.floorPlan.filter(plan => (plan.type == 'circle3d')&&(plan.name =='snowmen'));     

    }
	loadScenery = () =>{
        let that = this;

        return new Promise((resolve, reject) => {
            this.gltfLoader = new GLTFLoader();
            this.gltfLoader.load(this.config.sceneryPath, (res) => {
            	that.scaleScene(res.scene);
                that.centerScene(res.scene);
                that.addScenery(res);
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
        this.sceneDims = box;
    }

    getSceneDims = () =>{
        if(!this.sceneDims){
            console.log('no sceneDims');
            return false;
        } else {
            return this.sceneDims;
        };
    }

    createCollider = (gltfScene) =>{
        let that = this;
			// visual geometry setup
         // visual geometry setup
            const toMerge = {};
            gltfScene.traverse( c => {

                if ( c.isMesh ) {
                    c.castShadow = that.config.castShadow;
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
                    newMesh.castShadow = false;
                    newMesh.receiveShadow = false;
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
            collider.material.opacity = 0.5;
            collider.material.transparent = true;
            if(this.config.visualize===true){
                this.visualizer = new MeshBVHVisualizer( collider, 10 );
            }

        return collider;

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
             //    let planePos = new THREE.Vector3(0,hit.point.y,0);
             //   this.addPlaneAtPos(planePos);
//this.scene.add(new THREE.ArrowHelper( raycaster.ray.direction, raycaster.ray.origin, 200, Math.random() * 0xffffff ));
        // let planePos = new THREE.Vector3(0,hit.point.y,0);
        //    this.addPlaneAtPos(planePos);

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

     //   hit.point.applyMatrixWorld( this.sceneryMesh.matrixWorld );
       if(hit){
         let planePos = new THREE.Vector3(0,hit.point.y,0);
             //this.addPlaneAtPos(planePos);
            return hit.point.y+0.001;
       } else {
            return false;
        }
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