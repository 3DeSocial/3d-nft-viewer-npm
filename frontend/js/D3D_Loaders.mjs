import { Rhino3dmLoader  } from 'three/examples/jsm/loaders/3DMLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { AMFLoader } from 'three/examples/jsm/loaders/AMFLoader.js';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { GCodeLoader } from "three/examples/jsm/loaders/GCodeLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRCubeTextureLoader } from "three/examples/jsm/loaders/HDRCubeTextureLoader.js";
import { IFCLoader } from "three/examples/jsm/loaders/IFCLoader.js";
import { KMZLoader } from "three/examples/jsm/loaders/KMZLoader.js";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import { KTXLoader } from "three/examples/jsm/loaders/KTXLoader.js";
import { LDrawLoader } from "three/examples/jsm/loaders/LDrawLoader.js";
import { LogLuvLoader } from "three/examples/jsm/loaders/LogLuvLoader.js";
import { LottieLoader } from "three/examples/jsm/loaders/LottieLoader.js";
import { LUT3dlLoader } from "three/examples/jsm/loaders/LUT3dlLoader.js";
import { LUTCubeLoader } from "three/examples/jsm/loaders/LUTCubeLoader.js";
import { LWOLoader } from "three/examples/jsm/loaders/LWOLoader.js";
import { MD2Loader } from "three/examples/jsm/loaders/MD2Loader.js";
import { MDDLoader } from "three/examples/jsm/loaders/MDDLoader.js";
import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { NRRDLoader } from "three/examples/jsm/loaders/NRRDLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";
import { PDBLoader } from "three/examples/jsm/loaders/PDBLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { PRWMLoader } from "three/examples/jsm/loaders/PRWMLoader.js";
import { PVRLoader } from "three/examples/jsm/loaders/PVRLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { TDSLoader } from "three/examples/jsm/loaders/TDSLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import { TiltLoader } from "three/examples/jsm/loaders/TiltLoader.js";
import { VOXLoader, VOXMesh } from "three/examples/jsm/loaders/VOXLoader.js";
import { VRMLLoader } from "three/examples/jsm/loaders/VRMLLoader.js";
import { VTKLoader } from "three/examples/jsm/loaders/VTKLoader.js";
import { XYZLoader } from "three/examples/jsm/loaders/XYZLoader.js";
import * as THREE from 'three';


export default class D3DLoaders {

    constructor(config) {

        let defaults = {
                    defaultLoader: 'gltf',
                    useOwnHandlers: false
                };
        
        this.config = {
            ...defaults,
            ...config
        };

    }

    getLoaderForFormat = (format) =>{
 
        format = format.toLowerCase();
        this.loadingManager = new THREE.LoadingManager();
        // add handler for TGA textures
        this.loadingManager.addHandler( /\.tga$/i, new TGALoader() ); 
        let dracoLoader, ddsLoader, ktx2Loader, gltfLoader;
       switch(format){
            case '3dm': 
                let loader = new Rhino3dmLoader(this.loadingManager);
                    loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/' );
                    return loader;
                break;
            case '3ds': return new TDSLoader(this.loadingManager); break;
            case '3mf': return new ThreeMFLoader(this.loadingManager); break;
            case 'amf': return new AMFLoader(this.loadingManager); break;
            case 'bvh': return new BVHLoader(this.loadingManager); break;
            case 'basistexture': return new BasisTextureLoader(this.loadingManager); break;
            case 'dae': return new ColladaLoader(this.loadingManager); break;
            case 'dds': return new DDSLoader(this.loadingManager); break;
            case 'drc': 
                    dracoLoader = new DRACOLoader(this.loadingManager); 
                    dracoLoader.setDecoderPath( '/libs/draco/' );
                    dracoLoader.setDecoderConfig( { type: 'js' } );
                    return dracoLoader;
                break;
            case '3xr': return new EXRLoader(this.loadingManager); break;
            case 'fbx': return new FBXLoader(this.loadingManager); break;
            case 'font': return new FontLoader(this.loadingManager); break;
            case 'gcode': return new GCodeLoader(this.loadingManager); break;
            case 'glb':
            case 'gltf':
            case 'gtlf':
                        gltfLoader = new GLTFLoader(this.loadingManager); 
                    
                        dracoLoader = new DRACOLoader(this.loadingManager); 
                        dracoLoader.setDecoderPath( 'libs/draco/' );
                        dracoLoader.setDecoderConfig( { type: 'js' } );
                    
                        gltfLoader.setDRACOLoader(dracoLoader);
                    
                        ktx2Loader = new KTX2Loader(this.loadingManager);

                        gltfLoader.setKTX2Loader(ktx2Loader);
                    return gltfLoader;

                break;
            case 'hdrcubetexture': return new HDRCubeTextureLoader(this.loadingManager); break;
            case 'ifc': 
                let ifcLoader = new IFCLoader(this.loadingManager);
                    ifcLoader.ifcManager.setWasmPath( './libs/ifc/' );
                return ifcLoader;
            break;
            case 'kmz': return new KMZLoader(this.loadingManager); break;
            case 'ktx2': return new KTX2Loader(this.loadingManager); break;
            case 'ldraw','mpd': return new LDrawLoader(this.loadingManager); break;
            case 'lut3dl': return new LUT3dlLoader(this.loadingManager); break;
            case 'lutcube': return new LUTCubeLoader(this.loadingManager); break;
            case 'lwo': return new LWOLoader(this.loadingManager); break;
            case 'logluv': return new LogLuvLoader(this.loadingManager); break;
            case 'lottie': return new LottieLoader(this.loadingManager); break;
            case 'md2': return new MD2Loader(this.loadingManager); break;
            case 'mdd': return new MDDLoader(this.loadingManager); break;
            case 'mmd': return new MMDLoader(this.loadingManager); break
            case 'pmd': return new MMDLoader(this.loadingManager); break
            case 'vmd': return new MMDLoader(this.loadingManager); break
            case 'vpd': return new MMDLoader(this.loadingManager); break;
            case 'mtl': return new MTLLoader(this.loadingManager); break;
            case 'nrrd': return new NRRDLoader(this.loadingManager); break;
            case 'obj': return new OBJLoader(this.loadingManager); break;
            case 'pcd': return new PCDLoader(this.loadingManager); break;
            case 'pdb': return new PDBLoader(this.loadingManager); break;
            case 'ply': return new PLYLoader(this.loadingManager); break;
            case 'prwm': return new PRWMLoader(this.loadingManager); break;
            case 'pvr': return new PVRLoader(this.loadingManager); break;
            case 'rgbe': return new RGBELoader(this.loadingManager); break;
            case 'rgbm': return new RGBMLoader(this.loadingManager); break;
            case 'stl': return new STLLoader(this.loadingManager); break;
            case 'svg': return new SVGLoader(this.loadingManager); break;
            case 'tds': return new TDSLoader(this.loadingManager); break;
            case 'tga': return new TGALoader(this.loadingManager); break;
            case 'ttf': return new TTFLoader(this.loadingManager); break;
            case 'tilt': return new TiltLoader(this.loadingManager); break;
            case 'vox': return new VOXLoader(this.loadingManager); break;
            case 'vrm': return new GLTFLoader(this.loadingManager); break;            
            case 'vrml': case 'wrl': return new VRMLLoader(this.loadingManager); break;
            case 'vtk': return new VTKLoader(this.loadingManager); break;
            case 'xyz': return new XYZLoader(this.loadingManager); break;
            default: return false; break;
       }

    }    

}
export {D3DLoaders}