import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {XRControllerModelFactory} from '3d-nft-viewer';
export const name = 'VRControls';
class VRControls {

	   
	constructor(config) {

		let defaults = {
			renderer: null,
			scene: null
		};

		this.config = {
			...defaults,
			...config
		};
        this.player = this.config.player;
    	this.init();
    }

    init = () =>{
        this.cameraVector = new THREE.Vector3();
        this.dolly = null;
        this.prevGamePads = new Map();
        this.speedFactor = [0.8, 0.8, 0.8, 0.8];
        this.flyingSpeedFactor = [0.1, 0.1, 0.1, 0.1];
        this.controllers = [];
    	this.renderer = this.config.renderer;
    	this.scene = this.config.scene;
    	this.camera = this.config.camera;

    }

    buildControllers() {
        // controllers
        let controller1 = this.renderer.xr.getController(0);
        controller1.name = 'left';
        //controller1.addEventListener("selectstart", onSelectStart);
        //controller1.addEventListener("selectend", onSelectEnd);
        this.scene.add(controller1);

        let controller2 = this.renderer.xr.getController(1);
        controller2.name = 'right';
        //controller2.addEventListener("selectstart", onSelectStart);
        //controller2.addEventListener("selectend", onSelectEnd);
        this.scene.add(controller2);

        var controllerModelFactory = new XRControllerModelFactory(new GLTFLoader());

        let controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
        this.scene.add(controllerGrip1);

        let controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
        this.scene.add(controllerGrip2);

        //Raycaster Geometry
        var geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);

        var line = new THREE.Line(geometry);
        line.name = 'line';
        line.scale.z = 5;

        controller1.add(line.clone());
        controller2.add(line.clone());

        //dolly for camera
        let dolly = new THREE.Group();
        let vrY = this.config.playerStartPos.y-1;
        dolly.position.copy(this.config.player.position);
        dolly.name = 'dolly';
        this.scene.add(dolly);
        dolly.rotateY(0);
        dolly.add(this.camera);
        this.camera.position.copy(this.config.playerStartPos);
        this.camera.position.setY(this.camera.position.y+2);
        this.camera.rotateY(0);
        //add the controls to the dolly also or they will not move with the dolly
        dolly.add(controller1);
        dolly.add(controller2);
        dolly.add(controllerGrip1);
        dolly.add(controllerGrip2);
        dolly.rotateY(Math.PI)
        this.dolly = dolly;
        return dolly;
    }

    checkControllers = () =>{
            var handedness = 'unknown';
            var self = this;
            //determine if we are in an xr session
            const session = this.renderer.xr.getSession();

            if (session) {
                var i = 0;
                let xrCamera = this.renderer.xr.getCamera(this.camera);
                if (!xrCamera) {
                    return;
                }
                xrCamera.getWorldDirection(self.cameraVector);
                //a check to prevent console errors if only one input source
                if (this.isIterable(session.inputSources)) {
                    for (const source of session.inputSources) {
                        if (source && source.handedness) {
                            handedness = source.handedness; //left or right controllers
                        }
                        if (!source.gamepad) continue;
                        const controller = this.renderer.xr.getController(i++);
                        const old = this.prevGamePads.get(source);
                        const data = {
                            handedness: handedness,
                            buttons: source.gamepad.buttons.map((b) => b.value),
                            axes: source.gamepad.axes.slice(0)
                        };

                        if (old) {
                            data.buttons.forEach((value, i) => {
                                //handlers for buttons
                                if (value !== old.buttons[i] || Math.abs(value) > 0.8) {
                                    //check if it is 'all the way pushed'
                                    if (value === 1) {
                                        //console.log("Button" + i + "Down");
                                        if (data.handedness == 'left') {
                                            //console.log("Left Paddle Down");
                                            if (i == 1) {
                                             //   self.player.rotateY(-THREE.MathUtils.degToRad(1));
                                            }
                                            if (i == 3) {
                                                self.dolly.position.copy(this.config.playerStartPos);
                                            }
                                        } else {
                                            //console.log("Right Paddle Down");
                                            if (i == 1) {
                                               // self.player.rotateY(THREE.MathUtils.degToRad(1));
                                            }
                                        }
                                    } else {
                                        // console.log("Button" + i + "Up");

                                        if (i == 1) {
                                            //use the paddle buttons to rotate
                                            if (data.handedness == 'left') {
                                                //console.log("Left Paddle Down");
                                             //   self.player.rotateY(
                                              //      -THREE.MathUtils.degToRad(Math.abs(value))
                                               // );
                                            } else {
                                                //console.log("Right Paddle Down");
                                           //     self.player.rotateY(
                                             //      THREE.MathUtils.degToRad(Math.abs(value))
                                               // );
                                            }
                                        }
                                    }
                                }
                            });

                            data.axes.forEach((value, i) => {
                                //handlers for thumbsticks
                                // console.log('axes: ',i);
                                //if thumbstick axis has moved beyond the minimum threshold from center, windows mixed reality seems to wander up to about .17 with no input
                                if (Math.abs(value) > 0.5) {
                                    //set the speedFactor per axis, with acceleration when holding above threshold, up to a max speed
                                    self.speedFactor[i] > 1
                                        ? (self.speedFactor[i] = 1)
                                        : (self.speedFactor[i] *= 1.001);
                                    //  console.log(value, self.speedFactor[i], i);
                                    if (i == 2) {
                                        //left and right axis on thumbsticks
                                        if (data.handedness == 'left') {
                                            this.handleLeftController(data, value);
                                        } else {
                                            this.handleRightController(data, value);

                                        }
                                    }
                                    if (i == 3) {
                                        //up and down axis on thumbsticks
                                        if (data.handedness == 'left') {
                                            this.handleLeftController(data, value);
                                        } else {
                                            this.handleRightController(data, value);
                                        }
                                    }
                                } else {
     
                                }
                            });
                        }
                        this.prevGamePads.set(source, data);
                    }
                }
            }
        }

    handleLeftController = (data, value) =>{
        this.handleLeftThumbstick('left',data, value);

    }

    handleRightController = (data, value) =>{
        this.handleRightThumbstick('right',data, value);

    }

    handleLeftThumbstick = (hand, data, value) =>{
        if(this.isOverMovementThreshold(data.axes[2])){
            if (data.axes[2] > 0) {
                //console.log(hand+ ' stick: right ',data.axes[2]);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyRight(data);
                    break;
                    default:
                        this.moveRight(data);
                    break;
                }
            } else if (data.axes[2] < 0) {
                //console.log(hand+ ' stick: left',data.axes[2]);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyLeft(data);
                    break;
                    default:
                        this.moveLeft(data);
                    break;
                }
            };
        };

        if(this.isOverMovementThreshold(data.axes[3])){
            if(data.axes[3] > 0){
                //console.log(hand+ ' stick: back',data.axes[3]);
                this.flyUp(data, value);
            } else if (data.axes[3] < 0){
                //console.log(hand + ' stick: forward',data.axes[3]);
                this.flyDown(data, value);
            };
        };

    }

    handleRightThumbstick = (hand, data, value) =>{
        if(this.isOverMovementThreshold(data.axes[2])){
            if (data.axes[2] > 0) {
              //  console.log(hand+ ' stick: right ',data.axes[2]);
                this.rotateRight(data, value);
            } else if (data.axes[2] < 0) {
                //console.log(hand+ ' stick: left',data.axes[2]);
                this.rotateLeft(data, value);
            };
        };

        if(this.isOverMovementThreshold(data.axes[3])){
             //   console.log(hand+ ' stick: back',data.axes[3]);
            if(data.axes[3] > 0){
                //console.log(hand+ ' stick: right ',data.axes[2],this.config.vrType);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyBackward(data);
                    break;
                    default:
                        this.moveBackward(data);
                    break;
                }
            } else if (data.axes[3] < 0){
                //console.log(hand + ' stick: forward',data.axes[3],this.config.vrType);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyForward(data);
                    break;
                    default:
                        this.moveForward(data);
                    break;
                }             
            };
        };

    }

    isOverMovementThreshold = (value) =>{
        if(Math.abs(value)>0.5){
            return true;
        };
        return false;
    }

    flyForward = (data) => {
     /*   let nextPos = new THREE.Vector3();
        nextPos.copy(this.dolly.position);
        nextPos.x -= this.cameraVector.x * this.speedFactor[3] * data.axes[3];
        nextPos.z -= this.cameraVector.z * this.speedFactor[3] * data.axes[3];
        this.dolly.lookAt(nextPos);*/
        this.dolly.position.x -= this.cameraVector.x * this.flyingSpeedFactor[3] * data.axes[3];
        this.dolly.position.z -= this.cameraVector.z * this.flyingSpeedFactor[3] * data.axes[3];

    }

    moveForward = (data) =>{

     /*   let nextPos = new THREE.Vector3();
        nextPos.copy(this.dolly.position);
        nextPos.x -= this.cameraVector.x * this.speedFactor[3] * data.axes[3];
        nextPos.z -= this.cameraVector.z * this.speedFactor[3] * data.axes[3];
        this.dolly.lookAt(nextPos);      */
        this.config.moveForward(data);        

    }

    flyBackward = (data) => {
        this.dolly.position.x -= this.cameraVector.x * this.flyingSpeedFactor[3] * data.axes[3];
        this.dolly.position.z -= this.cameraVector.z * this.flyingSpeedFactor[3] * data.axes[3];
    }
    moveBackward = (data) => {
        this.config.moveBack(data);
    }

    flyLeft = (data) => {
        this.dolly.position.x -= this.cameraVector.z * this.flyingSpeedFactor[2] * data.axes[2];
        this.dolly.position.z += this.cameraVector.x * this.flyingSpeedFactor[2] * data.axes[2];        
    }

    moveLeft = (data) => {
        this.config.moveLeft(data);
    }

    flyRight = (data) => {
        this.dolly.position.x -= this.cameraVector.z * this.flyingSpeedFactor[2] * data.axes[2];
        this.dolly.position.z += this.cameraVector.x * this.flyingSpeedFactor[2] * data.axes[2];        
    }

    moveRight = (data) => {
        this.config.moveRight(data);
    }

    flyUp = (data) => {
        this.dolly.position.y += this.flyingSpeedFactor[3] * data.axes[3];
    }

    moveUp = (data) => {
        this.config.moveUp(data);
    }

    flyDown = (data) =>{
        this.dolly.position.y += this.flyingSpeedFactor[3] * data.axes[3];
    }

    moveDown = (data) => {
        this.config.moveDown(data);
        
    }

    rotateLeft = (data,value) => {
        this.config.rotateLeft(data,value);
    }

    rotateRight = (data,value) => {
        this.config.rotateRight(data,value);
    }

	/*dollyMove = () =>{
        var handedness = 'unknown';
        var self = this;
        //determine if we are in an xr session
        const session = this.renderer.xr.getSession();

        if (session) {
            var i = 0;
            let xrCamera = this.renderer.xr.getCamera(this.camera);
            if (!xrCamera) {
                return;
            }
            xrCamera.getWorldDirection(self.cameraVector);

            //a check to prevent console errors if only one input source
            if (this.isIterable(session.inputSources)) {
                for (const source of session.inputSources) {
                    if (source && source.handedness) {
                        handedness = source.handedness; //left or right controllers
                    }
                    if (!source.gamepad) continue;
                    const controller = this.renderer.xr.getController(i++);
                    const old = this.prevGamePads.get(source);
                    const data = {
                        handedness: handedness,
                        buttons: source.gamepad.buttons.map((b) => b.value),
                        axes: source.gamepad.axes.slice(0)
                    };

                    if (old) {
                        data.buttons.forEach((value, i) => {
                            //handlers for buttons
                            if (value !== old.buttons[i] || Math.abs(value) > 0.8) {
                                //check if it is 'all the way pushed'
                                if (value === 1) {
                                    //console.log("Button" + i + "Down");
                                    if (data.handedness == 'left') {
                                        //console.log("Left Paddle Down");
                                        if (i == 1) {
                                            self.dolly.rotateY(-THREE.MathUtils.degToRad(1));
                                        }
                                        if (i == 3) {
                                            //reset teleport to home position
                                            self.dolly.position.x = 0;
                                            self.dolly.position.y = 5;
                                            self.dolly.position.z = 0;
                                        }
                                    } else {
                                        //console.log("Right Paddle Down");
                                        if (i == 1) {
                                            self.dolly.rotateY(THREE.MathUtils.degToRad(1));
                                        }
                                    }
                                } else {
                                    // console.log("Button" + i + "Up");

                                    if (i == 1) {
                                        //use the paddle buttons to rotate
                                        if (data.handedness == 'left') {
                                            //console.log("Left Paddle Down");
                                            self.dolly.rotateY(
                                                -THREE.MathUtils.degToRad(Math.abs(value))
                                            );
                                        } else {
                                            //console.log("Right Paddle Down");
                                            self.dolly.rotateY(
                                                THREE.MathUtils.degToRad(Math.abs(value))
                                            );
                                        }
                                    }
                                }
                            }
                        });
                        data.axes.forEach((value, i) => {
                            //handlers for thumbsticks
                            // console.log('axes: ',i);
                            //if thumbstick axis has moved beyond the minimum threshold from center, windows mixed reality seems to wander up to about .17 with no input
                            if (Math.abs(value) > 0.1) {
                                //set the speedFactor per axis, with acceleration when holding above threshold, up to a max speed
                                self.speedFactor[i] > 1
                                    ? (self.speedFactor[i] = 1)
                                    : (self.speedFactor[i] *= 1.001);
                                //  console.log(value, self.speedFactor[i], i);
                                if (i == 2) {
                                    //   console.log('data.handedness: '+data.handedness);
                                    //left and right axis on thumbsticks
                                    if (data.handedness == 'left') {
                                        //   (data.axes[2] > 0) ? console.log('left on left thumbstick') : console.log('right on left thumbstick')

                                        //move our dolly
                                        //we reverse the vectors 90degrees so we can do straffing side to side movement
                                        self.dolly.position.x -=
                                            self.cameraVector.z *
                                            self.speedFactor[i] *
                                            data.axes[2];
                                        self.dolly.position.z +=
                                            self.cameraVector.x *
                                            self.speedFactor[i] *
                                            data.axes[2];

                                        //provide haptic feedback if available in browser
                                        /*  if (
                                    source.gamepad.hapticActuators &&
                                    source.gamepad.hapticActuators[0]
                                ) {
                                    var pulseStrength = Math.abs(data.axes[2]) + Math.abs(data.axes[3]);
                                    if (pulseStrength > 0.75) {
                                        pulseStrength = 0.75;
                                    }

                                    var didPulse = source.gamepad.hapticActuators[0].pulse(
                                        pulseStrength,
                                        100
                                    );
                                }*
                                    } else {
                                        //    console.log('RH ata.axes[2]: '+data.axes[2]);
                                        //    (data.axes[2] > 0) ? console.log('left on right thumbstick') : console.log('right on right thumbstick'); // !!!THIS WORKS!!!
                                        self.dolly.rotateY(-THREE.MathUtils.degToRad(data.axes[2]));
                                    }
                                    // self.controls.update();
                                }

                                if (i == 3) {
                                    //up and down axis on thumbsticks
                                    if (data.handedness == 'left') {
                                        // (data.axes[3] > 0) ? console.log('up on left thumbstick') : console.log('down on left thumbstick')
                                        self.dolly.position.y -= self.speedFactor[i] * data.axes[3];
                                        //provide haptic feedback if available in browser
                                        /*  if (
                                    source.gamepad.hapticActuators &&
                                    source.gamepad.hapticActuators[0]
                                ) {
                                    var pulseStrength = Math.abs(data.axes[3]);
                                    if (pulseStrength > 0.75) {
                                        pulseStrength = 0.75;
                                    }
                                    var didPulse = source.gamepad.hapticActuators[0].pulse(
                                        pulseStrength,
                                        100
                                    );
                                }*
                                    } else {
                                        // (data.axes[3] > 0) ? console.log('up on right thumbstick') : console.log('down on right thumbstick')
                                        self.dolly.position.x -=
                                            self.cameraVector.x *
                                            self.speedFactor[i] *
                                            data.axes[3];
                                        self.dolly.position.z -=
                                            self.cameraVector.z *
                                            self.speedFactor[i] *
                                            data.axes[3];

                                        //provide haptic feedback if available in browser
                                        /*    if (
                                    source.gamepad.hapticActuators &&
                                    source.gamepad.hapticActuators[0]
                                ) {
                                    var pulseStrength = Math.abs(data.axes[2]) + Math.abs(data.axes[3]);
                                    if (pulseStrength > 0.75) {
                                        pulseStrength = 0.75;
                                    }
                                    var didPulse = source.gamepad.hapticActuators[0].pulse(
                                        pulseStrength,
                                        100
                                    );
                                }*
                                        //self.controls.update();
                                    }
                                }
                            } else {
                                //axis below threshold - reset the speedFactor if it is greater than zero  or 0.025 but below our threshold
                                if (Math.abs(value) > 0.025) {
                                    self.speedFactor[i] = 0.025;
                                }
                            }
                        });
                    }
                    this.prevGamePads.set(source, data);
                }
            }
        }
    }
*/
	isIterable = (obj) =>{
        // checks for null and undefined
        if (obj == null) {
            return false;
        }
        return typeof obj[Symbol.iterator] === 'function';
    }
}
export {VRControls}