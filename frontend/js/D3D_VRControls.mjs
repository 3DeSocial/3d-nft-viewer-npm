import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {XRControllerModelFactory} from '3d-nft-viewer';
export const name = 'VRControls';
class VRControls {

	   
	constructor(config) {

		let defaults = {
			renderer: null,
			scene: null,
            flyUp: (data, value)=>{
                                                          
            },
            flyDown:(data, value)=>{
              
            },
            flyLeft:(data, value)=>{
                
            },                                            
            flyRight:(data, value)=>{
              
            },
            flyForward:(data, value)=>{
                                                        
            },
            flyBack:(data, value)=>{
               
            },
            stopMoving:()=>{

            },
            triggerLeft:(data, value)=>{

            },
            triggerRight:(data, value)=>{

            },
            paddleLeft:(data, value)=>{

            },         
            paddleRight:(data, value)=>{

            },
            onSelectStart: () =>{

            },
            onSelectEnd: () => {

            },
             onSelectStartLeft: (e)=>{

            },
            onSelectEndLeft: (e)=>{

            },
            onSelectStartRight: (e)=>{
            },
            onSelectEndRight: (e)=>{
            }

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
        this.buildControllers();

    }

    buildControllers = () =>{
        let that = this;
        this.controllers = [];
        this.grips = [];
        // controllers
        let controller1 = this.renderer.xr.getController(0);
        controller1.name = 'left';
        controller1.addEventListener("selectstart", (e)=>{
            that.config.onSelectStartLeft(e,controller1);
        });
        controller1.addEventListener("selectend", ("selectstart", (e)=>{
            that.config.onSelectEndLeft(e,controller1);
        }));
      //  this.scene.add(controller1);
        this.controllers.push(controller1);

        let controller2 = this.renderer.xr.getController(1);
        controller2.name = 'right';
        controller2.addEventListener("selectstart", (e)=>{
            that.config.onSelectStartRight(e,controller2);
        });
        controller2.addEventListener("selectend", (e)=>{
            that.config.onSelectEndRight(e,controller2);
        });
       // this.scene.add(controller2);
        this.controllers.push(controller2);

        var controllerModelFactory = new XRControllerModelFactory(new GLTFLoader());

        let controllerGrip1 = this.renderer.xr.getControllerGrip(0);
        controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
        //this.scene.add(controllerGrip1);
        this.grips.push(controllerGrip1);

        let controllerGrip2 = this.renderer.xr.getControllerGrip(1);
        controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
       // this.scene.add(controllerGrip2);
        this.grips.push(controllerGrip2);

        //Raycaster Geometry
        var geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);

        var line = new THREE.Line(geometry);
        line.name = 'line';
        line.scale.z = 5;
        let line1 = line.clone();
        let line2 = line.clone();
        controller1.add(line1);
        controller2.add(line2);
        controller1.line = line1;
        controller2.line = line2;
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
                                    if (value === 1) { // button is down
                                        if (data.handedness == 'left') {
                                            this.handleLeftControllerButtons(data, value, i);
                                        } else {
                                            this.handleRightControllerButtons(data, value, i);
                                        }
                                    } else { // button is up
                                        if (data.handedness == 'left') {
                                            this.handleLeftControllerButtons(data, value, i);
                                        } else {
                                            this.handleRightControllerButtons(data, value, i);
                                        }
                                        
                                    }
                                }
                            });

                            data.axes.forEach((value, i) => {
                                //handlers for thumbsticks
                                // console.log('axes: ',i);
                                //if thumbstick axis has flyd beyond the minimum threshold from center, windows mixed reality seems to wander up to about .17 with no input
                                    //set the speedFactor per axis, with acceleration when holding above threshold, up to a max speed
                                    self.speedFactor[i] > 0.5
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

    handleLeftControllerButtons = (data, value, i) =>{
        switch(i){
            case 0:
                this.triggerLeft(data,value,i);
            break;
            case 1:
                this.paddleLeft(data,value,i);
            break;
        }
    }

    handleRightController = (data, value) =>{
        this.handleRightThumbstick('right',data, value);

    }

    handleRightControllerButtons = (data, value, i) =>{
        switch(i){
            case 0:
                this.triggerRight(data,value,i);
            break;
            case 1:
                this.paddleRight(data,value,i);
            break;
        }
    }

    handleLeftThumbstick = (hand, data, value) =>{

        if(this.isOverMovementThreshold(data.axes[2])){
            if (data.axes[2] > 0) {
                //console.log(hand+ ' stick: right ',data.axes[2]);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyRight(data, value);
                    break;
                    default:
                     //   console.log('move right');
                        this.moveRight(data, value);
                    break;
                }
            } else if (data.axes[2] < 0) {
           //     console.log(hand+ ' stick: left',data.axes[2]);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyLeft(data, value);
                    break;
                    default:
                   //     console.log('move left');
                        this.moveLeft(data, value);
                    break;
                }
            };
        } else {
            this.config.stopMoving();
        }

        if(this.isOverMovementThreshold(data.axes[3])){
             //   console.log(hand+ ' stick: back',data.axes[3]);
            if(data.axes[3] > 0){
              //  console.log(hand+ ' stick: right ',data.axes[2],this.config.vrType);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyBackward(data, value);
                    break;
                    default:
                        this.moveBackward(data, value);
                    break;
                }
            } else if (data.axes[3] < 0){
              //  console.log(hand + ' stick: forward',data.axes[3],this.config.vrType);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyForward(data, value);
                    break;
                    default:
                        this.moveForward(data, value);
                    break;
                }             
            };
        } else {
            this.config.stopMoving();
        }

      
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
        } else {
            this.config.cancelRotate();
        }

        if(this.isOverMovementThreshold(data.axes[3])){
             //   console.log(hand+ ' stick: back',data.axes[3]);
            if(data.axes[3] > 0){
            //    console.log(hand+ ' stick: right ',data.axes[2],this.config.vrType);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyBackward(data, value);
                    break;
                    default:
                        this.moveBackward(data, value);
                    break;
                }
            } else if (data.axes[3] < 0){
                //console.log(hand + ' stick: forward',data.axes[3],this.config.vrType);
                switch(this.config.vrType){
                    case 'flying':
                        this.flyForward(data, value);
                    break;
                    default:
                        this.moveForward(data, value);
                    break;
                }             
            };
        } else {
            this.config.stopMoving();
        }

    }

    isOverMovementThreshold = (value) =>{
        if(Math.abs(value)>0.5){
            return true;
        };
        return false;
    }

    flyForward = (data, value) => {
     /*   let nextPos = new THREE.Vector3();
        nextPos.copy(this.dolly.position);
        nextPos.x -= this.cameraVector.x * this.speedFactor[3] * data.axes[3];
        nextPos.z -= this.cameraVector.z * this.speedFactor[3] * data.axes[3];
        this.dolly.lookAt(nextPos);*/
      //  this.dolly.position.x -= this.cameraVector.x * this.flyingSpeedFactor[3] * data.axes[3];
        //this.dolly.position.z -= this.cameraVector.z * this.flyingSpeedFactor[3] * data.axes[3];
        this.config.flyForward(data, value);        


    }

    moveForward = (data, value) =>{

     /*   let nextPos = new THREE.Vector3();
        nextPos.copy(this.dolly.position);
        nextPos.x -= this.cameraVector.x * this.speedFactor[3] * data.axes[3];
        nextPos.z -= this.cameraVector.z * this.speedFactor[3] * data.axes[3];
        this.dolly.lookAt(nextPos);      */
        this.config.moveForward(data, value);        

    }

    flyBackward = (data, value) => {
      //  this.dolly.position.x -= this.cameraVector.x * this.flyingSpeedFactor[3] * data.axes[3];
       // this.dolly.position.z -= this.cameraVector.z * this.flyingSpeedFactor[3] * data.axes[3];
        this.config.flyBack(data, value);   

    }
    moveBackward = (data, value) => {
        this.config.moveBack(data, value);   
    }

    flyLeft = (data, value) => {
        this.config.flyLeft(data, value);

        //this.dolly.position.x -= this.cameraVector.z * this.flyingSpeedFactor[2] * data.axes[2];
        //this.dolly.position.z += this.cameraVector.x * this.flyingSpeedFactor[2] * data.axes[2];        
    }

    moveLeft = (data, value) => {
        this.config.moveLeft(data, value);
    }

    flyRight = (data, value) => {
        this.config.flyRight(data, value);   

     //   this.dolly.position.x -= this.cameraVector.z * this.flyingSpeedFactor[2] * data.axes[2];
       // this.dolly.position.z += this.cameraVector.x * this.flyingSpeedFactor[2] * data.axes[2];        
    }

    moveRight = (data, value) => {
        this.config.moveRight(data, value);   
    }

    flyUp = (data, value) => {
       // this.dolly.position.y += this.flyingSpeedFactor[3] * data.axes[3];
        this.config.flyUp(data, value);   

    }

    moveUp = (data, value) => {
        this.config.moveUp(data, value);   
    }

    flyDown = (data, value) =>{
        this.config.flyDown(data, value);   

       // this.dolly.position.y += this.flyingSpeedFactor[3] * data.axes[3];
    }

    moveDown = (data, value) => {
        this.config.moveDown(data, value);   
        
    }

    rotateLeft = (data,value) => {
   // console.log('VRControla rotateLeft')

        this.config.rotateLeft(data,value);
    }

    rotateRight = (data,value) => {
    console.log('VRControla rotateRight')
        this.config.rotateRight(data,value);
    console.log('rotated right');
    }

    triggerLeft = (data, value) => {
        this.config.triggerLeft(data, value);   
    }

    paddleLeft = (data, value) => {
        this.config.paddleLeft(data, value);   
    }

    triggerRight = (data, value) => {
        this.config.triggerRight(data, value);   
    }

    paddleRight = (data, value) => {
        this.config.paddleRight(data, value);   
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