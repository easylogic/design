import _refreshSelection from "./_refreshSelection";

export default function addLayer (editor, layer, rect = {}, isSelected = true) {

    var containerItem = editor.selection.current || editor.selection.currentProject

    if (containerItem) {

        if (!containerItem.is('project') && !containerItem.enableHasChildren()) {
            containerItem = containerItem.parent;
        }

        containerItem.add(layer)

        if (rect.x) { layer.setScreenX(rect.x.value); }
        if (rect.y) { layer.setScreenY(rect.y.value); }

        if (isSelected) {
            editor.selection.select(layer);
        }

        _refreshSelection(editor,true, 10)
    }
}