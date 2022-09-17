export const name = 'd3dntfviewer';
import * as THREE from 'three';

export default class ActionHandler  {

    constructor(config) {
    }


    handleMouseRightClick = () =>{

    }

    handleMouseLeftClick = () =>{

    }

    throw = (mesh, target) =>{


        camera.getWorldDirection( playerDirection );

        sphere.collider.center.copy( playerCollider.end ).addScaledVector( playerDirection, playerCollider.radius * 1.5 );

        // throw the ball with more force if we hold the button longer, and if we move forward

        const impulse = 15 + 30 * ( 1 - Math.exp( ( mouseTime - performance.now() ) * 0.001 ) );

        sphere.velocity.copy( playerDirection ).multiplyScalar( impulse );
        sphere.velocity.addScaledVector( playerVelocity, 2 );

        sphereIdx = ( sphereIdx + 1 ) % spheres.length;

    }
}
export {ActionHandler}