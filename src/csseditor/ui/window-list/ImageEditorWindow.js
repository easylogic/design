import BaseWindow from "./BaseWindow";
import { EVENT } from "../../../util/UIElement";

export default class ImageEditorWindow extends BaseWindow {

    getClassName() {
        return 'image-editor-window'
    }

    getTitle() {
        return 'Image Editor'
    }

    initState() {
        return {
            image: null
        }
    }

    afterRender() {
        this.trigger('showImageEditorWindow');
    }

    getBody() {
        return /*html*/`

        `
    }

    [EVENT('showImageEditorWindow')] (image) {
        this.show();
        this.setState({ image })        
    }

    refresh() {
        // refresh image 
    }
}