export const name = 'd3dntfviewer';
import * as THREE from 'three';
var TO_RADIANS = Math.PI / 180;

        function randomRange(min, max) {
            return ((Math.random() * (max - min)) + min);
        }
        let Particle3D = function(material) {
            //THREE.Sprite.call(this, material);

            //this.material = material instanceof Array ? material : [ material ];
            // define properties
            this.velocity = new THREE.Vector3(0, -8, 0);
            this.velocity.rotateX(randomRange(-45, 45));
            this.velocity.rotateY(randomRange(0, 360));
            this.gravity = new THREE.Vector3(0, 0, 0);
            this.drag = 1;
            // methods...
        };

        Particle3D.prototype = new THREE.Sprite();
        Particle3D.prototype.constructor = Particle3D;

        Particle3D.prototype.updatePhysics = function() {
            this.velocity.multiplyScalar(this.drag);
            this.velocity.add(this.gravity);
            this.position.add(this.velocity);
        }

        THREE.Vector3.prototype.rotateY = function(angle) {
            let cosRY = Math.cos(angle * TO_RADIANS);
            let sinRY = Math.sin(angle * TO_RADIANS);

            var tempz = this.z;
            var tempx = this.x;

            this.x = (tempx * cosRY) + (tempz * sinRY);
            this.z = (tempx * -sinRY) + (tempz * cosRY);
        }

        THREE.Vector3.prototype.rotateX = function(angle) {
            let cosRY = Math.cos(angle * TO_RADIANS);
            let sinRY = Math.sin(angle * TO_RADIANS);

            var tempz = this.z;
            var tempy = this.y;

            this.y = (tempy * cosRY) + (tempz * sinRY);
            this.z = (tempy * -sinRY) + (tempz * cosRY);
        }

        THREE.Vector3.prototype.rotateZ = function(angle) {
            let cosRY = Math.cos(angle * TO_RADIANS);
            let sinRY = Math.sin(angle * TO_RADIANS);

            var tempx = this.x;;
            var tempy = this.y;

            this.y = (tempy * cosRY) + (tempx * sinRY);
            this.x = (tempy * -sinRY) + (tempx * cosRY);
        }


export default class SnowFall  {

    constructor(config) {


         // returns a random number between the two limits provided
        this.config = config;
       
        this.init();

    }


    init = () =>{


        var particle;

        var mouseX = 0;
        var mouseY = 0;

        var windowHalfX = window.innerWidth / 2;
        var windowHalfY = window.innerHeight / 2;

        this.particles = [];

        var material = new THREE.SpriteMaterial( { map: new THREE.TextureLoader().load('/images/snowflake.png') } );

        for (var i = 0; i < 500; i++) {

            particle = new Particle3D( material);
            particle.position.x = Math.random() * 200 - 100;
            particle.position.y = Math.random() * 200 - 100;
            particle.position.z = Math.random() * 200 - 100;
            particle.scale.x = 22;
            particle.scale.y = 22;
            this.config.scene.add( particle );

            this.particles.push(particle);
        }

        setInterval(this.updateParticles, 1000 / 60);

    }

    //

    updateParticles = () => {
        let particles = this.particles;
        for(var i = 0; i<particles.length; i++) {

            var particle = particles[i];
            particle.updatePhysics();

            let x = particle.position.x;
            let y = particle.position.y;
            let z = particle.position.z;
                if(y<-1000) y+=2000;
                if(x>1000) x-=2000;
                else if(x<-1000) x+=2000;
                if(z>1000) z-=2000;
                else if(z<-1000) z+=2000;
            
        }
/*
        camera.position.x += ( mouseX - camera.position.x ) * 0.05;
        camera.position.y += ( - mouseY - camera.position.y ) * 0.05;
        camera.lookAt(scene.position);
*/
    //    renderer.render( scene, camera );

    }

   
}
export {SnowFall}