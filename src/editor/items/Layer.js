import { DomItem } from "./DomItem";
import { Length } from "../unit/Length";
import icon from "../../csseditor/ui/icon/icon";

export class Layer extends DomItem {

  static getIcon () {
    return icon.rect;
  }

  getDefaultObject(obj = {}) {
    return super.getDefaultObject({
      itemType: "layer",
      name: "New Layer",
      tagName: 'div',
      ...obj
    });
  }

  getDefaultTitle() {
    return "Layer";
  } 

  getIcon() {
    return icon.rect;
  }


  toCloneObject() {
    return {
      ...super.toCloneObject(),
      tagName: this.json.tagName
    }
  }
}