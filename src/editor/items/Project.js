import { AssetItem } from "./AssetItem";
import { ComponentManager } from "../manager/ComponentManager";
import { Length } from "../unit/Length";

export class Project extends AssetItem {
  getDefaultTitle() {
    return "New Project";
  }

  get isAbsolute  (){
    return false;
  }  

  get parent () {
    return null;
  }

  get screenX () {
    return Length.z();
  }

  get screenY () {
    return Length.z();
  }

  toRootVariableCSS () {
    var obj = {}
    this.json.rootVariable.split(';').filter(it => it.trim()).forEach(it => {
      var [key, value] = it.split(':')

      obj[`--${key}`] = value; 
    })

    return obj;
  }  

  getDefaultObject(obj = {}) {
    return super.getDefaultObject({
      itemType: "project",
      name: 'new Project',
      description: '',
      rootVariable: '',            
      ...obj
    });
  }

  toCloneObject() {
    var { name, description, rootVariable } = this.json;
    return {
      ...super.toCloneObject(),
      name,
      description, 
      rootVariable
    }
  }

  get artboards () {
    return this.json.layers || [];
  }

  get html () {
    return this.artboards.map(it => it.html).join('\n\n');
  }
}

ComponentManager.registerComponent('project', Project);
