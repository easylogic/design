import _refreshSelection from "./_refreshSelection";

const createItem = (editor, obj) => {

    obj.layers = obj.layers.map(it => {
        return createItem(editor, it);
    })

    return editor.components.createComponent(obj.itemType, obj);
}


export default {
    command: 'load.json', 
    execute: function (editor, json) {

        json = json || editor.loadResource('projects', []);

        var projects = json.map(p => createItem(editor, p))

        projects.forEach(p => {
            p.layers.forEach(layer => {
                if (layer.is('artboard')) {
                    layer.selectTimeline()
                }
            })
        })

        if (projects.length) {
            var project = projects[0]
            editor.selection.selectProject(project)
            editor.load(projects);
            _refreshSelection(editor)            
        }
    }
}