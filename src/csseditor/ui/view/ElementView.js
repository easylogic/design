import UIElement, { EVENT } from "../../../util/UIElement";
import { BIND, POINTERSTART, MOVE, END, IF, KEYUP, DROP, DRAGOVER, PREVENT } from "../../../util/Event";
import { Length } from "../../../editor/unit/Length";

import Dom from "../../../util/Dom";
import SelectionToolView from "../view-items/SelectionToolView";
import GuideLineView from "../view-items/GuideLineView";
import LayerAppendView from "../view-items/LayerAppendView";
import PathEditorView from "../view-items/PathEditorView";
import GridLayoutLineView from "../view-items/GridLayoutLineView";
import PathDrawView from "../view-items/PathDrawView";
import BrushDrawView from "../view-items/BrushDrawView";
import { isFunction } from "../../../util/functions/func";
import StyleView from "./StyleView";


export default class ElementView extends UIElement {

    components() {
        return {
            StyleView,
            SelectionToolView,
            GuideLineView,
            PathEditorView,
            PathDrawView,
            LayerAppendView,
            BrushDrawView,
            GridLayoutLineView,
        }
    }

    initState() {
        return {
            mode: 'selection',
            left: Length.z(),
            top: Length.z(),
            width: Length.px(10000),
            height: Length.px(10000),
            cachedCurrentElement: {},
            html: ''
        }
    }

    template() {
        return /*html*/`
            <div class='element-view' ref='$body'>
                <div class='canvas-view' ref='$view'></div>
                <div class='drag-area-rect' ref='$dragAreaRect'></div>
                <StyleView ref='$styleView' />
                <GuideLineView ref='$guideLineView' />
                <GridLayoutLineView ref='$gridLayoutLineView' />
                <SelectionToolView ref='$selectionTool' />
                <LayerAppendView ref='$objectAddView' />
                <PathEditorView ref='$pathEditorView' />
                <PathDrawView ref='$pathDrawView' />
                <BrushDrawView ref='$brushDrawView' />
            </div>
        `
    }

    getScrollXY () {
        return {
            width: this.refs.$body.scrollWidth(),
            height: this.refs.$body.scrollHeight(),
            left: this.refs.$body.scrollLeft(),
            top: this.refs.$body.scrollTop()
        }
    }

    [EVENT('afterChangeMode')] () {
        this.$el.attr('data-mode', this.$editor.mode);
    }

    [EVENT('refElement')] (id, callback) {
        isFunction(callback) && callback(this.getElement(id))
    }

    getElement (id) {
        return this.refs.$view.$(`[data-id="${id}"]`);
    }

    checkEmptyElement (e) {
        var $el = Dom.create(e.target)

        if (this.state.mode !== 'selection') {
            return false; 
        }

        return $el.hasClass('element-item') === false 
            && $el.hasClass('selection-tool-item') === false 
            && $el.hasClass('point') === false
            && $el.hasClass('handle') === false            
            && $el.hasClass('perspective-handle') === false
            && $el.hasClass('transform-tool-item') === false
            && $el.hasClass('transform-tool') === false            
            && $el.isTag('svg') === false 
            && $el.isTag('path') === false
            && $el.isTag('textPath') === false
            && $el.isTag('polygon') === false
            && $el.isTag('text') === false
            && $el.isTag('img') === false 
            && $el.attr('data-segment') !== 'true';
    }

    // 빈 영역 드래그 해서 선택하기 
    [POINTERSTART('$view') + IF('checkEmptyElement') + MOVE('movePointer') + END('moveEndPointer')] (e) {

        this.$target = Dom.create(e.target);

        this.dragXY = {x: e.xy.x, y: e.xy.y}; 

        this.rect = this.refs.$body.rect();            
        this.canvasOffset = this.refs.$view.rect();

        this.canvasPosition = {
            x: this.canvasOffset.left - this.rect.x,
            y: this.canvasOffset.top - this.rect.y
        }

        this.dragXY.x -= this.rect.x
        this.dragXY.y -= this.rect.y

        if (this.$editor.isSelectionMode()) {

            var obj = {
                left: Length.px(this.dragXY.x),
                top: Length.px(this.dragXY.y),
                width: Length.z(),
                height: Length.z()
            }        
    
            this.refs.$dragAreaRect.css(obj) 

            this.state.cachedCurrentElement = {}
            this.$el.$$('.selected').forEach(it => it.removeClass('selected'))
        }

    }

    checkInAreaForLayers (target, rect) {
        return target.checkInAreaForLayers(rect);
    }

    movePointer (dx, dy) {
        const isShiftKey = this.$config.get('bodyEvent').shiftKey;

        if (isShiftKey) {
            dy = dx; 
        }

        var obj = {
            left: Length.px(this.dragXY.x + (dx < 0 ? dx : 0)),
            top: Length.px(this.dragXY.y + (dy < 0 ? dy : 0)),
            width: Length.px(Math.abs(dx)),
            height: Length.px(Math.abs(dy))
        }        

        this.refs.$dragAreaRect.css(obj)

        if (this.$editor.isSelectionMode()) {

            var {left: x, top: y, width, height } = obj

            var rect = {
                x: Length.px(x.value -  this.canvasPosition.x), 
                y: Length.px(y.value - this.canvasPosition.y), 
                width, 
                height
            }

            rect.x2 = Length.px(rect.x.value + rect.width.value);
            rect.y2 = Length.px(rect.y.value + rect.height.value); 

            var project = this.$selection.currentProject;
            var items = []; 
            if (project) {
                Object.keys(rect).forEach(key => {
                    rect[key].div(this.$editor.scale)
                })

                if (rect.width.value === 0 && rect.height.value === 0) {
                    items = [] 
                } else {
                    // 프로젝트 내에 있는 모든 객체 검색 
                    project.artboards.forEach(artboard => {
                        items.push(...artboard.checkInAreaForLayers(rect))
                    })
                }
    
                if (this.$selection.select(...items)) {
                    this.selectCurrent(...items)
                }

            }
        }
    }

    moveEndPointer (dx, dy) {
        var [x, y, width, height ] = this.refs.$dragAreaRect
                .styles('left', 'top', 'width', 'height')
                .map(it => Length.parse(it))

        var rect = {
            x: Length.px(x.value -  this.canvasPosition.x), 
            y: Length.px(y.value - this.canvasPosition.y), 
            width, 
            height
        }

        rect.x2 = Length.px(rect.x.value + rect.width.value);
        rect.y2 = Length.px(rect.y.value + rect.height.value);

        this.refs.$dragAreaRect.css({
            left: Length.px(-10000),
            top: Length.z(),
            width: Length.z(),
            height: Length.z()
        })


        if (this.$editor.isSelectionMode()) {

            var project = this.$selection.currentProject;
            var items = [] 
            if (project) {
                Object.keys(rect).forEach(key => {
                    rect[key].div(this.$editor.scale)
                })

                // 프로젝트 내에 있는 모든 객체 검색 
                project.artboards.forEach(artboard => {
                    items.push(...artboard.checkInAreaForLayers(rect))
                })

                if (rect.width.value === 0 && rect.height.value === 0) {
                    items = [] 
                } 

                if (this.$selection.select(...items)) {
                    this.selectCurrent(...items)
                }
    
                if (items.length) {
                    this.emit('refreshSelection')
                } else {
                    this.$selection.select();
                    this.emit('emptySelection')
                }                
            } else {
                this.$selection.select();                
                this.emit('emptySelection')            
            }
        }

        this.sendHelpMessage();
        this.emit('removeGuideLine')
    }

    sendHelpMessage () {

        if (this.$selection.length === 1) {
            var current = this.$selection.current;

            if (current.is('svg-path', 'svg-brush', 'svg-polygon', 'svg-textpath')) {
                this.emit('addStatusBarMessage', 'Please click if you want to edit to path ');
            }

        } 

    }


    [KEYUP('$view .element-item.text')] (e) {
        var content = e.$dt.html()
        var text = e.$dt.text().trim()
        var id = e.$dt.attr('data-id');

        var arr = [] 
        this.$selection.items.filter(it => it.id === id).forEach(it => {
            it.reset({ content, text })
            arr.push({id:it.id, content, text})
        })

        this.emit('refreshContent', arr);
    }

    checkEditMode () {
        return this.$editor.isSelectionMode()
    }

    findArtboard(point) {
        return this.$selection.currentProject.layers.find(it => it.is('artboard') && it.hasPoint(point.x, point.y))
    }

    // 특정 element 선택 후 이동하기 
    [POINTERSTART('$view .element-item') + IF('checkEditMode')  + MOVE('calculateMovedElement') + END('calculateEndedElement')] (e) {
        this.startXY = e.xy ; 
        this.$element = e.$dt;

        this.rect = this.refs.$body.rect();            
        this.canvasOffset = this.refs.$view.rect();

        this.canvasPosition = {
            x: this.canvasOffset.left - this.rect.x,
            y: this.canvasOffset.top - this.rect.y
        }

        this.newScreenXY = this.screenXY = {
            x: this.startXY.x - this.rect.x,
            y: this.startXY.y - this.rect.y,
        }

        if (this.$element.hasClass('text') && this.$element.hasClass('selected')) {
            return false; 
        }

        var id = this.$element.attr('data-id')        
        this.hasSVG = false;

        if (e.shiftKey) {
            this.$selection.toggleById(id);
        } else {

            if (this.$selection.check({ id } )) {
                if (this.$selection.current.is('svg-path', 'svg-brush', 'svg-textpath', 'svg-polygon')) {
                    this.hasSVG = true; 
                }
            } else {
                this.$selection.selectById(id);    
            }
        }

        this.currentContainer = this.findArtboard(this.screenXY);
    
        this.selectCurrent(...this.$selection.items)
        this.$selection.setRectCache()
        this.emit('refreshSelection');
        this.children.$selectionTool.initMoveType();
    }

    calculateMovedElement (dx, dy) {

        // dx, dy 는 마우스 포인터 기준의 좌표고 
        // screenX, screenY 기준의 dx, dy 가 아니기 때문에 
        // screenX, screenY 기준의 dx, dy 가 필요하다. 
        // 이 때, 객체의 container 가 바뀌는 시점이 오는데 
        // container 가 바뀔 때 그 시점 기준으로 startXY 를 다시 맞춰야 한다. 
        // 즉, dx, dy 의 포인트가 달아지는데.. 
        // 예를 들어 startXY 에서 시작했는데 pointXY 로 startXY 가 바뀌게 되면 
        // dx , dy 를 어떻게 계산해야할까? 
        // 초기 screenX.x + dx 가 총 이동 거리였다면 
        //     pointXY.x + X 가 새로운 이동 거리가 되고   여기서 X 를 구해야한다. 
        // startXY.x + dx  - pointXY.x = newDX 가 되는가? 

        const newDx = this.screenXY.x + dx - this.newScreenXY.x;
        const newDy = this.screenXY.y + dy - this.newScreenXY.y;

        this.children.$selectionTool.refreshSelectionToolView(newDx, newDy, 'move');
        this.updateRealPosition();     

        this.replaceContainer(dx, dy);
    }

    // 영역에 따라  현재 선택된 객체의  artboard 컨테이너  바꾸기 
    replaceContainer (dx, dy) {

        const current = this.$selection.current; 
        if (!current) return; 
        if (current.is('artboard')) return; 

        const screenXY = {
            x: this.startXY.x + dx - this.rect.x,
            y: this.startXY.y + dy - this.rect.y,
        }       

        const targetContainer = this.findArtboard(screenXY);

        // 영역이 없고 project 동일한 프로젝트가 아니라면 
        if (!targetContainer) {
            if (this.currentContainer != this.$selection.currentProject) {
                this.currentContainer = this.$selection.currentProject;
                this.$selection.each(item => {
                    this.currentContainer.add(item);
                })     
                this.initDragStart(dx, dy);
            }
            
        } else if (targetContainer.id !== this.currentContainer.id) {

            this.currentContainer = targetContainer;
            this.$selection.each(item => {
                this.currentContainer.add(item);
            })       

            this.initDragStart(dx, dy);
        }         
    }

    // container 가 바뀌었을 때  마우스 포인터 초기화를 한다. 
    initDragStart (dx, dy) {
        this.newScreenXY = {
            x: this.startXY.x + dx - this.rect.x,
            y: this.startXY.y + dy - this.rect.y,
        }     
        this.$selection.reselect();
        this.selectCurrent(...this.$selection.items)
        this.emit('refreshAll')
    }

    updateRealPositionByItem (item) {
        var {x, y, width, height} = item.toBound();
        var cachedItem = this.state.cachedCurrentElement[item.id]

        if (!cachedItem) {
            this.state.cachedCurrentElement[item.id] = this.getElement(item.id);
            cachedItem = this.state.cachedCurrentElement[item.id]
        }

        if (cachedItem) {
            cachedItem.cssText(`left: ${x};top:${y};width:${width};height:${height}; transform: ${item.transform};`)
        }
    }

    updateRealPosition() {
        this.$selection.each(item => {
            this.updateRealPositionByItem(item);
        })

        this.emit('refreshRect');        
    }
    [EVENT('refreshArtBoardName')] (id, title) {
        this.$el.$(`[data-id='${id}']`).attr('data-title', title);
    }

    calculateEndedElement (dx, dy) {

        if (dx === 0 && dy === 0) {
            if (this.hasSVG) {
                this.emit('openPathEditor');
                return; 
            }

        } else {
            this.$selection.setRectCache()                
            this.emit('removeGuideLine')        
        }
    }

    [BIND('$body')] () {
        var width = Length.px(this.$editor.canvasWidth);
        var height = Length.px(this.$editor.canvasHeight);

        return {
            'data-mode': this.$editor.mode,
            style: {
                'position': 'relative',
                width,
                height
            }
        }
    }


    [BIND('$view')] () {
    
        return {
            style: {
                // 'background-image': createGridLine(100),
                // 'box-shadow': '0px 0px 5px 0px rgba(0, 0, 0, .5)',
                transform: `scale(${this.$editor.scale})`
            },
            innerHTML: this.state.html
        }
    }    

    selectCurrent (...args) {
        this.state.cachedCurrentElement = {}
        var $selectedElement = this.$el.$$('.selected');

        if ($selectedElement) {
            $selectedElement.forEach(it => it.removeClass('selected'))
        }

        if (args.length) {
            var selector = args.map(it => `[data-id='${it.id}']`).join(',')

            var list = this.$el.$$(selector);
            
            list.forEach(it => {
                this.state.cachedCurrentElement[it.attr('data-id')] = it; 
                it.addClass('selected')
            })
    
        }

        this.children.$selectionTool.initSelectionTool()
    } 
    
    modifyScale () {
        this.refs.$view.css({
            transform: `scale(${this.$editor.scale})`
        })

        this.emit('makeSelectionTool', true);
    }

    [EVENT('changeScale')] () {
       this.modifyScale();
    }

    // 객체를 부분 업데이트 하기 위한 메소드 
    [EVENT(
        'refreshCanvasForPartial', 
        'refreshSelectionStyleView', 
        'refreshSelectionDragStyleView'     // tool 에서 드래그 할 때 변경 사항 적용 
    )] (obj, isChangeFragment = true,  isLast = false) {
        var items = obj ? [obj] : this.$selection.items;

        items.forEach(current => {
            this.updateElement(current, isChangeFragment, isLast);
        })
    }

    updateElement (item, isChangeFragment = true, isLast = false) {
        if (item) {
            item.updateFunction(this.getElement(item.id), isChangeFragment, isLast);
            this.updateRealPositionByItem(item);
        }

    }

    // 타임라인에서 객체를 업데이트 할 때 발생함. 
    updateTimelineElement (item, isChangeFragment = true, isLast = false) {
        if (item) {
            item.updateFunction(this.getElement(item.id), isChangeFragment, isLast, this, true);
            this.updateRealPositionByItem(item);
        }

    }    

    [EVENT('playTimeline', 'moveTimeline')] (artboard) {


        var timeline = artboard.getSelectedTimeline();
        timeline.animations.map(it => artboard.searchById(it.id)).forEach(current => {
            // 레이어 업데이트 사항 중에 updateFunction 으로 업데이트 되는 부분 
            // currentTime 도 매번 업데이트 되기 때문에 
            // playbackRate 도 매번 업데이트 되고
            // 그래서 막는게 필요하다.                 
            // timeline 에서 실행되는것에 따라서  layer 에서 각자 알아서 업데이트 한다. 
            this.updateTimelineElement(current, true, false);
        })
    }    

    /**
     * 
     * isRefreshSelectionTool 옵션에 따라 selection 을 정의  
     * 
     * 기본적으로 project 내부의 전체 html 을 만들고 기존 dom 과 비교해서 업데이트 한다. 
     * @param {boolean} isRefreshSelectionTool 
     */
    [EVENT('refreshAllCanvas')] (isRefreshSelectionTool = true) {
        var project = this.$selection.currentProject || { html : ''} 
        var html = project.html
        this.setState({ html }, false)
        // this.bindData('$view');

        // html 상태 업데이트 하고 
        this.refs.$view.updateDiff(html)

        // 캐쉬된 element 초기화  
        this.state.cachedCurrentElement = {} 

        // 좌표 초기화 
        this.updateRealPosition();

        if (isRefreshSelectionTool) {
            this.children.$selectionTool.initSelectionTool()
        }
    }

    refresh() {
        if (this.state.html != this.prevState.html) {
            this.load();
        } else {
            // NOOP 
        }
    }

    [EVENT('refreshAllElementBoundSize')] () {

        var selectionList = this.$selection.items.map(it => it.is('artboard') ? it : it.parent)

        var list = [...new Set(selectionList)];
        list.forEach(it => {
            this.trigger('refreshElementBoundSize', it);
        })

        this.$selection.setRectCache()
    }

    [EVENT('refreshElementBoundSize')] (parentObj) {
        if (parentObj) {
            parentObj.layers.forEach(it => {
                if (it.isLayoutItem()) {
                    var $el = this.getElement(it.id);

                    if ($el) {
                        const {x, y, width, height} = $el.offsetRect();

                        // console.log(x, y, width, height, $el, it);

                        it.reset({
                            x: Length.px(x),
                            y: Length.px(y),
                            width: Length.px(width),
                            height: Length.px(height)
                        })
    
                        // if (it.is('component')) {
                        //     this.emit('refreshStyleView', it, true);
                        // }
    
                        // svg 객체  path, polygon 은  크기가 바뀌면 내부 path도 같이 scale up/down  이 되어야 하는데 
                        // 이건 어떻게 적용하나 ....                     
                        this.trigger('refreshSelectionStyleView', it, true);
                    }
                }

                this.trigger('refreshElementBoundSize', it);  
            })
        }
    }   

    [DRAGOVER('view') + PREVENT] () {}
    [DROP('$view') + PREVENT] (e) {

        const id = Dom.create(e.target).attr('data-id');

        if (id) {

            if (this.$selection.length) {
                this.emit('drop.asset', {
                    gradient: e.dataTransfer.getData('text/gradient'),
                    color: e.dataTransfer.getData('text/color'),
                    imageUrl: e.dataTransfer.getData('image/info')
                })
            } else {
                this.emit('drop.asset', {
                    gradient: e.dataTransfer.getData('text/gradient'),
                    color: e.dataTransfer.getData('text/color'),
                    imageUrl: e.dataTransfer.getData('image/info')
                }, id)
            }


        } else {
            const imageUrl = e.dataTransfer.getData('image/info')
            this.emit('dropImageUrl', imageUrl)
        }

    }
}