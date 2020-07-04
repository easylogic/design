import BaseProperty from "./BaseProperty";
import { LOAD, CLICK, DOUBLECLICK, PREVENT, STOP, FOCUSOUT, VDOM, DRAGSTART, KEYDOWN, DRAGOVER, DROP, BIND, DRAGEND, ENTER } from "../../../util/Event";
import icon from "../icon/icon";
import { EVENT } from "../../../util/UIElement";

import Color from "../../../util/Color";
import { Length } from "../../../editor/unit/Length";

const DRAG_START_CLASS = 'drag-start'

export default class LayerTreeProperty extends BaseProperty {
  getTitle() {
    return this.$i18n('layer.tree.property.title')
  }

  getClassName() {
    return 'full'
  }

  initState() {
    return {
      hideDragPointer: true,
      lastDragOverPosition: 0,
      lastDragOverOffset: 0,
      rootRect: { top: 0 },
      itemRect: { height: 0 }
    }
  }

  getTools() {
    return /*html*/`
      <button type='button' ref='$add' title="Add a layer">${icon.add}</button>
    `
  }

  getBody() {
    return /*html*/`
      <div class="layer-list scrollbar" ref="$layerList"></div>
      <div class='drag-point' ref='$dragPointer'></div>
    `;
  }

  [BIND('$dragPointer')] () {


    var offset = this.state.lastDragOverOffset 
    var dist = this.state.itemRect.height/3; 
    var bound = {} 

    if (this.state.lastDragOverOffset < dist) {
      offset = 0;

      var top = this.state.lastDragOverPosition + offset - this.state.rootRect.top

      bound = {
        top: Length.px(top),
        height: '1px',
        width: '100%',
        left: '0px'
      }

      this.state.lastDragOverItemDirection = 'before';
    } else if (this.state.lastDragOverOffset > this.state.itemRect.height - dist) {
      offset = this.state.itemRect.height; 

      var top = this.state.lastDragOverPosition + offset - this.state.rootRect.top

      bound = {
        top: Length.px(top),
        height: '1px',
        width: '100%',
        left: '0px'
      }            
      this.state.lastDragOverItemDirection = 'after';      
    } else {
      offset = 0; 

      var top = this.state.lastDragOverPosition + offset - this.state.rootRect.top

      bound = {
        top: Length.px(top),
        height: Length.px(this.state.itemRect.height),
        width: '100%',
        left: '0px'
      }      
      this.state.lastDragOverItemDirection = 'self';      
    }

    

    return {
      style: {
        position: 'absolute',
        ...bound,
        'display': this.state.hideDragPointer ? 'none':  'block'
      }
    }
  }

  //FIXME: 개별 객체가 아이콘을 리턴 할 수 있도록 구조를 맞춰보자. 
  getIcon (item) {
    // return '';

    if (item.isGroup && item.is('artboard') === false) {
      return icon.group
    }

    switch(item.itemType) {
    case 'artboard': 
      return icon.artboard;
    case 'circle': 
      return icon.lens;
    case 'image': 
      return icon.image;
    case 'text': 
    case 'svg-text':
      return icon.title;    
    case 'svg-textpath':
      return icon.text_rotate;
    case 'svg-path': 
      return icon.pentool      
    case 'cube' : 
      return icon.cube;
    case 'cylinder':
      return icon.cylinder;
    default: 
      return icon.rect
    }
  }

  makeLayerList (parentObject, depth = 0) {
    if (!parentObject.layers) return '';

    return [...parentObject.layers].reverse().map( (layer, index) => {

      var selected = this.$selection.check(layer) ? 'selected' : '';
      var name = layer.name; 

      if (layer.is('text')) {
        name = layer.text || layer.name 
      }
      var title = ''; 

      if (layer.hasLayout()) {
        title = this.$i18n('layer.tree.property.layout.title.' + layer.layout)
      }

      const isHide = layer.isTreeItemHide()

      return /*html*/`        
      <div class='layer-item ${selected}' data-is-group="${layer.isGroup}" data-depth="${depth}" data-layout='${layer.layout}' data-layer-id='${layer.id}' data-is-hide="${isHide}"  draggable="true">
        <div class='detail'>
          <label data-layout-title='${title}' > 
            <div class='folder ${layer.collapsed ? 'collapsed' : ''}'>${icon.arrow_right}</div>
            <span class='icon' data-item-type="${layer.itemType}" style='color: ${layer['background-color']};'>${this.getIcon(layer)}</span> 
            <span class='name'>${name}</span>
          </label>
          <div class="tools">
            <button type="button" class="lock" data-lock="${layer.lock}" title='Lock'>${layer.lock ? icon.lock : icon.lock_open}</button>
            <button type="button" class="visible" data-visible="${layer.visible}" title='Visible'>${icon.visible}</button>
          </div>
        </div>
      </div>

      ${this.makeLayerList(layer, depth+1)}
    `
    }).join('')
  }

  [EVENT('refreshContent')] (arr) {
    this.refresh();
  }

  [LOAD("$layerList") + VDOM]() {

    var project = this.$selection.currentProject;
    if (!project) return ''

    return this.makeLayerList(project, 0) + /*html*/`
      <div class='layer-item ' data-depth="0" data-is-last="true">
      </div>
    `
  }

  [DRAGSTART('$layerList .layer-item')] (e) {
    var layerId = e.$dt.attr('data-layer-id');
    e.$dt.addClass(DRAG_START_CLASS);
    e.dataTransfer.setData('layer/id', layerId);
    this.state.rootRect = this.refs.$layerList.rect()
    this.state.itemRect = e.$dt.rect();
    this.setState({
      hideDragPointer: false 
    }, false)

    this.bindData('$dragPointer');
  }

  [DRAGEND('$layerList .layer-item')] (e) {
    this.setState({
      hideDragPointer: true 
    }, false)

    this.bindData('$dragPointer');

    this.refs.$layerList.$$(`.${DRAG_START_CLASS}`).forEach(it => {
      it.removeClass(DRAG_START_CLASS);
    })
  }

  [DRAGOVER(`$layerList .layer-item:not(.${DRAG_START_CLASS})`) + PREVENT] (e) {
    var targetLayerId = e.$dt.attr('data-layer-id') 
    // console.log({targetLayerId, x: e.offsetX, y: e.offsetY});

    this.state.lastDragOverItemId = targetLayerId;
    this.state.lastDragOverPosition = e.$dt.rect().top;
    this.state.lastDragOverOffset = e.offsetY;

    this.bindData('$dragPointer')

  }
  [DROP(`$layerList .layer-item:not(.${DRAG_START_CLASS})`)] (e) {
    var targetLayerId = e.$dt.attr('data-layer-id')
    var sourceLayerId = e.dataTransfer.getData('layer/id');

    if (targetLayerId === sourceLayerId) return; 
    var project = this.$selection.currentProject

    if (project) {
      var targetItem = project.searchById(targetLayerId);
      var sourceItem = project.searchById(sourceLayerId);

      if (targetItem && targetItem.hasParent(sourceItem.id)) return; 

      targetItem.add(sourceItem, this.state.lastDragOverItemDirection);

      this.$selection.select(sourceItem);

      this.setState({
        hideDragPointer: true 
      })

      this.emit('refreshAll')      

    }
  }

  [DOUBLECLICK('$layerList .layer-item')] (e) {
    this.startInputEditing(e.$dt.$('.name'))
  }



  modifyDoneInputEditing (input) {
    this.endInputEditing(input, (index, text) => {


      var id = input.closest('layer-item').attr('data-layer-id');

      var project = this.$selection.currentProject;
      if (project) {
        var item = project.searchById(id)
        if (item) {
          item.reset({ name: text })
        }
  
      }


    });    
  }

  [KEYDOWN('$layerList .layer-item .name') + ENTER + PREVENT + STOP] (e) {
    this.modifyDoneInputEditing(e.$dt);
  }

  [FOCUSOUT('$layerList .layer-item .name') + PREVENT  + STOP ] (e) {
    this.modifyDoneInputEditing(e.$dt);
  }

  selectLayer(layer) {

    if (layer) {
      this.$selection.select(layer)
    }

    this.refresh()
    this.emit('refreshSelection');
  }

  addLayer (layer) {
    if (layer) {
      this.$selection.select(layer);

      this.emit('refreshArtboard')
    }
  }

  [CLICK('$add')] (e) {

    this.emit('newComponent', 'rect', {
      'background-color': Color.random(),
      width: Length.px(200),
      height: Length.px(100)
    });
  }

  [CLICK('$layerList .layer-item label .name')] (e) {
    var project = this.$selection.currentProject
    if (project) {

      var $item = e.$dt.closest('layer-item')
      $item.onlyOneClass('selected');

      var id = $item.attr('data-layer-id');
      var item = project.searchById(id);
      this.$selection.select(item)

      this.emit('refreshSelection');      

    }
  }

  [CLICK('$layerList .layer-item label .folder')] (e) {
    const project = this.$selection.currentProject;

    var $item = e.$dt.closest('layer-item')
    var id = $item.attr('data-layer-id');
    var item = project.searchById(id);

    item.reset({
      collapsed: !item.collapsed
    })

    this.refresh();

  }  

  [CLICK('$layerList .layer-item .visible')] (e) {
    var project = this.$selection.currentProject
    if (project) {
      var $item = e.$dt.closest('layer-item')
      var id = $item.attr('data-layer-id');

      var item = project.searchById(id);      
      e.$dt.attr('data-visible', !item.visible);

      this.emit('setAttribute', {
        visible: !item.visible
      }, item.id)
    }
  }


  [CLICK('$layerList .layer-item .lock')] (e) {
    var project = this.$selection.currentProject
    if (project) {
      var $item = e.$dt.closest('layer-item')
      var id = $item.attr('data-layer-id');

      var item = project.searchById(id);
      
      e.$dt.attr('data-lock', !item.lock);

      this.emit('setAttribute', {
        lock: !item.lock
      }, item.id)
    }
  }


  [EVENT('emptySelection')] () {
    this.refs.$layerList.$$('.selected').forEach(it => {
      it.removeClass('selected')
    })
  }

  [EVENT('changeSelection')] (isSelection = false) {
    if (isSelection && this.refs.$layerList) {    
      this.refs.$layerList.$$('.selected').forEach(it => {
        it.removeClass('selected')
      })

      var selector = this.$selection.items.map(it => {
        return `[data-layer-id="${it.id}"]`
      }).join(',')

      if (selector) {
        this.refs.$layerList.$$(selector).forEach(it => {

          it.addClass('selected')

          var item = this.$selection.itemKeys[it.attr('data-layer-id')]
          if (item.is('svg-path', 'svg-polygon') ) {
            it.$('.icon').html(this.getIcon(item));
          }

        })
      }
    }
  }  

  [EVENT('refreshSelection')] () { 
    this.trigger('changeSelection', true)
  }

  [EVENT('refreshStylePosition', 'refreshSelectionStyleView', 'refreshCanvasForPartial')] () { 
    this.trigger('changeSelection')
  }

  [EVENT('refreshLayerTreeView')] () {
    this.refresh();
  }

  [EVENT('changeItemLayout')] () {
    this.refresh();
  }


}
