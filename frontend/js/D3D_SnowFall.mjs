export const name = 'd3dntfviewer';
import * as THREE from 'three';
var TO_RADIANS = Math.PI / 180;

        function randomRange(min, max) {
            return ((Math.random() * (max - min)) + min);
        }
        class Particle3D {
              constructor(config) {

                    this.sprite = new THREE.Sprite(config.material);

                    //this.material = material instanceof Array ? material : [ material ];
                    // define properties
                    this.velocity = new THREE.Vector3(0, -0.1, 0);
                    this.velocity.rotateX(randomRange(-0.1, 0.1));
                    this.velocity.rotateY(randomRange(0, 0.1));
                    this.gravity = new THREE.Vector3(0, 0, 0);
                    this.drag = 1;
                    // methods...            

              }
        };
 

        Particle3D.prototype.updatePhysics = function() {
            this.velocity.multiplyScalar(this.drag);
            this.velocity.add(this.gravity);
            this.sprite.position.add(this.velocity);
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

        for (var i = 0; i < 800; i++) {

            particle = new Particle3D({material:material});
            particle.sprite.position.x = Math.random() * 60 - 30;
            particle.sprite.position.y = Math.random() * 60;
            particle.sprite.position.z = Math.random() * 60 - 30;
            particle.sprite.scale.x = 0.25;
            particle.sprite.scale.y = 0.25;
            this.config.scene.add( particle.sprite );

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

            let x = particle.sprite.position.x;
            let y = particle.sprite.position.y;
            let z = particle.sprite.position.z;
                if(y<0){particle.sprite.position.y = 60};
                if(x>60) {particle.sprite.positionx-=120}
                else if(x<-60) {particle.sprite.positionx+=120};
                if(z>60) {particle.sprite.positionz-=120}
                else if(z<-60) {particle.sprite.positionz+=120};
            
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