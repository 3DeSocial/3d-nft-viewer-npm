import * as THREE from 'three';

export default class CollisionChecker  {

    constructor(config) {
        

        let defaults = {
            sceneCollider: null,
            dollyProxy: null,
            updatePos: () =>{

            }
        };

        this.config = {
            ...defaults,
            ...config
        };

        this.sceneCollider = this.config.sceneCollider;
        this.playerCollider = this.config.playerCollider;

        this.dollyProxy = this.config.dollyProxy;
        this.playerIsOnGround = false;
        this.playerVelocity = new THREE.Vector3();
        this.tempVector = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempBox = new THREE.Box3();
        this.tempMat = new THREE.Matrix4();
        this.tempSegment = new THREE.Line3();
        this.origDollyPos = new THREE.Vector3(); 
        this.gravity = - 10;

    }


    checkCollisions = (delta) =>{
        this.playerVelocity.y += this.playerIsOnGround ? 0 : delta * this.gravity;
        this.dollyProxy.position.addScaledVector( this.playerVelocity, delta );      
        this.dollyProxy.updateMatrixWorld();

        // adjust player position based on collisions
        const capsuleInfo = this.playerCollider.capsuleInfo;
        this.tempBox.makeEmpty();
        this.tempMat.copy( this.sceneCollider.matrixWorld ).invert();
        this.tempSegment.copy( capsuleInfo.segment );

        // get the position of the capsule in the local space of the this.collider
        this.tempSegment.start.applyMatrix4( this.dollyProxy.matrixWorld ).applyMatrix4( this.tempMat );
        this.tempSegment.end.applyMatrix4( this.dollyProxy.matrixWorld ).applyMatrix4( this.tempMat );

        // get the axis aligned bounding box of the capsule
        this.tempBox.expandByPoint( this.tempSegment.start );
        this.tempBox.expandByPoint( this.tempSegment.end );

        this.tempBox.min.addScalar( - capsuleInfo.radius );
        this.tempBox.max.addScalar( capsuleInfo.radius );

        this.sceneCollider.geometry.boundsTree.shapecast( {

            intersectsBounds: box => box.intersectsBox( this.tempBox ),

            intersectsTriangle: tri => {

                // check if the triangle is intersecting the capsule and adjust the
                // capsule position if it is.
                const triPoint = this.tempVector;
                const capsulePoint = this.tempVector2;

                const distance = tri.closestPointToSegment( this.tempSegment, triPoint, capsulePoint );
                if ( distance < capsuleInfo.radius ) {

                    const depth = capsuleInfo.radius - distance;
                    const direction = capsulePoint.sub( triPoint ).normalize();

                    this.tempSegment.start.addScaledVector( direction, depth );
                    this.tempSegment.end.addScaledVector( direction, depth );

                }

            }

        } );

        // get the adjusted position of the capsule this.collider in world space after checking
        // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
        // the origin of the player model.
        const newPosition = this.tempVector;
        newPosition.copy( this.tempSegment.start ).applyMatrix4( this.sceneCollider.matrixWorld );

        // check how much the this.collider was moved
        const deltaVector = this.tempVector2;
        deltaVector.subVectors( newPosition, this.dollyProxy.position );

        // if the player was primarily adjusted vertically we assume it's on something we should consider ground
        this.playerIsOnGround = deltaVector.y > Math.abs( delta * this.playerVelocity.y * 0.25 );
        //console.log('this.playerIsOnGround: ', this.playerIsOnGround);
        if(this.playerIsOnGround){
            this.playerCollider.material.color.set(0xff0000);
        } else {
            this.playerCollider.material.color.set(0x00ff00);
        }
        const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
        deltaVector.normalize().multiplyScalar( offset );

        // adjust the player model
        this.dollyProxy.position.add( deltaVector );
       if ( ! this.playerIsOnGround ) {

            deltaVector.normalize();
            this.playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( this.playerVelocity ) );

        } else {

            this.playerVelocity.set( 0, 0, 0 );


        }


    }

    updatePos = (dollyPos) =>{
        this.config.updatePos(dollyPos);
    }
}

export {CollisionChecker}