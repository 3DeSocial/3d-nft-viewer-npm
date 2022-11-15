
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
  }

  parse = (extraData3D)=> {
    this.extraData3D = JSON.parse(extraData3D);
  }

  getModelList = () =>{
    this.models = this.extraData3D['3DModels'];

    return this.models;
  }

  getAvailableFormats = () =>{
    
    //return unique list of formats

    let formats = [];
    let that = this;
    this.models.forEach((model, idx)=>{
      //console.log('models idx:',idx);
      //console.log(model);
      let formatList = that.getFormatsForModel(model);
      //console.log('formatList: ',formatList);
      formats =  [...formats, ...formatList];
    });

    return formats;

  }

  getFormatsForModel = (model) =>{
    if(!model){
      console.log('getFormatsForModel: no model');
      return false;
    };
    return Object.keys(model.ModelFormats);
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
          let version = formatsList[key];
          let versionString = format+'/'+version;
          versions.push(versionString);       
        } else {
        //  console.log('"'+key.trim()+'"<>"'+format.trim()+'"');

        }

      })
      return versions;
  }

  getVersionsForFormat = (modelIdx,format) =>{
    if(!this.models[modelIdx].ModelFormats[format]){
      return false;
    }
    return this.models[modelIdx].ModelFormats[format];
  }

  getModelPath(modelIdx,preferredFormat,preferredVersion){
    if(!this.models[modelIdx]){
      return false;
    };

    let format = '';
    let version = '';
    let path = '';

    let availableFormats = this.getFormatsForModel(this.models[modelIdx]);
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
        searchPath = searchPath.replaceAll(' ','%2520')
        searchPath = searchPath.replaceAll('%20','%2520');
    return searchPath;
  }
};
export {ExtraData3DParser}