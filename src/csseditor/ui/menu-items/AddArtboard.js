import MenuItem from "./MenuItem";
import icon from "../icon/icon";
import { EVENT } from "../../../util/UIElement";
 
export default class AddArtboard extends MenuItem {
  getIconString() {
    return icon.artboard;
  }
  getTitle() {
    return this.props.title || "Artboard";
  }

  clickButton(e) {
    this.emit('addLayerView', 'artboard');
  }

  [EVENT('addLayerView')] (type) {
    this.setSelected(type === 'artboard');
  }
}
