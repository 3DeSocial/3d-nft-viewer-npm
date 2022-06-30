
const rtrim =(str, chr) => {
  var rgxtrim = (!chr) ? new RegExp('\\s+$') : new RegExp(chr+'+$');
  return str.replace(rgxtrim, '');
}

export default class ExtraData3DParser {

  constructor(config) {    
    this.nftPostHashHex = config.nftPostHashHex;
    this.endPoint = rtrim(config.endPoint,'/');
    this.parse(config.extraData3D);
    this.getModelList();
    this.getAvailableFormats();
    console.log(this.formats);
    console.log('endPoint: ',this.endPoint);
  }

  parse = (extraData3D)=> {
    this.extraData3D = JSON.parse(extraData3D);
  }

  getModelList = () =>{
    this.models = this.extraData3D['3DModels'];
    console.log('getModelList: ',this.models);
  }

  getAvailableFormats = (modelIdx) =>{
    
    //return unique list of formats

    let formats = [];
    let that = this;
    this.models.forEach((model, idx)=>{
      let formatList = that.getFormatsForModel(idx);
      formats =  [...formats, ...formatList];
    });

    this.formats = formats.filter((c, index) => {
      return formats.indexOf(c) === index;
    });

  }

  getFormatsForModel = (modelIdx) =>{
    if(!this.models[modelIdx]){
      return false;
    };
    return Object.keys(this.models[modelIdx].ModelFormats);
  }

  getAvailableVersions = (modelIdx, format) =>{
    if(!this.models[modelIdx]){
      return false;
    };
    let versions = [];
    let formatsList = this.models[modelIdx].ModelFormats;
    Object.keys(formatsList).forEach((key, index) => {
        let formatName = key;
        if(key==='gtlf'){formatName='gltf'};
        if(formatName.trim() === format.trim()){
          console.log(key.trim()+'='+format.trim());
          let version = formatsList[key];
          console.log(version);
          let versionString = format+'/'+version;
                    console.log(versionString);

          versions.push(versionString);       
        } else {
          console.log('"'+key.trim()+'"<>"'+format.trim()+'"');

        }

      })
    console.log('versions',versions);
      return versions;
  }

  getVersionsForFormat = (modelIdx,format) =>{
    if(!this.models[modelIdx].ModelFormats[format]){
      console.log('format not available');
      return false;
    }
    return this.models[modelIdx].ModelFormats[format];
  }

  getModelPath(modelIdx,preferredFormat,preferredVersion){
    if(!this.models[modelIdx]){
      console.log('no model ',modelIdx);
      return false;
    };

    let format = '';
    let version = '';
    let path = '';

    let availableFormats = this.getFormatsForModel(modelIdx);
    if(availableFormats.indexOf(preferredFormat.toLowerCase())>-1){
      //format exists
      format = preferredFormat;
    } else {
      //use first available
      format = availableFormats[0];
    };

    let availableVersions = this.getVersionsForFormat(modelIdx,format);
    if(availableVersions.indexOf(preferredVersion.toLowerCase())>-1){
      version = preferredVersion;
    } else {
      version = availableVersions[0];
    };

    // path format <endpoint>/<format>/<version>/<anyfilename>.<format>
    let searchPath = this.endPoint+'/'+this.nftPostHashHex +'/'+format+'/'+version;
    return searchPath;
  }
};
export {ExtraData3DParser}