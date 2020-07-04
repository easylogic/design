import UIElement, { EVENT } from "../../../util/UIElement";
import { POINTERSTART, MOVE, END, BIND, POINTERMOVE, PREVENT, KEYUP, IF, STOP, CLICK, DOUBLECLICK, ENTER, ESCAPE } from "../../../util/Event";
import PathGenerator from "../../../editor/parse/PathGenerator";
import Dom from "../../../util/Dom";
import PathParser from "../../../editor/parse/PathParser";

import { SVGPathItem } from "../../../editor/items/layers/SVGPathItem";
import { Length } from "../../../editor/unit/Length";
import { getBezierPoints, recoverBezier, recoverBezierQuard, getBezierPointsQuard, recoverBezierLine, getBezierPointsLine } from "../../../util/functions/bezier";
import { isFunction } from "../../../util/functions/func";


/**
 * convert array[x, y] to object{x, y} 
 * 
 * @param {array} param0 
 */
function xy ([x, y]) {
    return {x, y}
}

const SegmentConvertor = class extends UIElement {

    [DOUBLECLICK('$view [data-segment]')] (e) {
        var index = +e.$dt.attr('data-index')

        this.pathGenerator.convertToCurve(index);

        this.renderPath()

        this.refreshPathLayer()
    }
}

const PathCutter = class extends SegmentConvertor {

    calculatePointOnLine (d, clickPosition) {
        var parser = new PathParser(d);

        if (parser.segments[1].command === 'C') {
            var points = [
                xy(parser.segments[0].values),
                xy(parser.segments[1].values.slice(0, 2)),
                xy(parser.segments[1].values.slice(2, 4)),
                xy(parser.segments[1].values.slice(4, 6))
            ]
    
            var curve = recoverBezier(...points, 200)
            var t = curve(clickPosition.x, clickPosition.y);

            return getBezierPoints(points, t).first[3]
    
        } else if (parser.segments[1].command === 'Q') {
            var points = [
                xy(parser.segments[0].values),
                xy(parser.segments[1].values.slice(0, 2)),
                xy(parser.segments[1].values.slice(2, 4))
            ]
    
            var curve = recoverBezierQuard(...points, 200)
            var t = curve(clickPosition.x, clickPosition.y);

            return getBezierPointsQuard(points, t).first[2]
        } else if (parser.segments[1].command === 'L') {
            var points = [
                xy(parser.segments[0].values),
                xy(parser.segments[1].values.slice(0, 2))
            ]

            var curve = recoverBezierLine(...points, 200)
            var t = curve(clickPosition.x, clickPosition.y);          
        
            return getBezierPointsLine(points, t).first[1]
        }     
        
        return clickPosition;
    }

    [CLICK('$view .split-path')] (e) {
        this.initRect()
        var parser = new PathParser(e.$dt.attr('d'));
        var clickPosition = {
            x: e.xy.x - this.state.rect.x, 
            y: e.xy.y - this.state.rect.y
        }; 

        if (parser.segments[1].command === 'C') {
            var points = [
                xy(parser.segments[0].values),
                xy(parser.segments[1].values.slice(0, 2)),
                xy(parser.segments[1].values.slice(2, 4)),
                xy(parser.segments[1].values.slice(4, 6))
            ]
    
            var curve = recoverBezier(...points, 200)
            var t = curve(clickPosition.x, clickPosition.y);
    
            this.changeMode('modify');
    
            this.pathGenerator.setPoint(getBezierPoints(points, t))        
    
        } else if (parser.segments[1].command === 'Q') {
            var points = [
                xy(parser.segments[0].values),
                xy(parser.segments[1].values.slice(0, 2)),
                xy(parser.segments[1].values.slice(2, 4))
            ]
    
            var curve = recoverBezierQuard(...points, 200)
            var t = curve(clickPosition.x, clickPosition.y);
    
            this.changeMode('modify');
    
            this.pathGenerator.setPointQuard(getBezierPointsQuard(points, t))        
        } else if (parser.segments[1].command === 'L') {
            var points = [
                xy(parser.segments[0].values),
                xy(parser.segments[1].values.slice(0, 2))
            ]

            var curve = recoverBezierLine(...points, 200)
            var t = curve(clickPosition.x, clickPosition.y);          

            this.changeMode('modify');
    
            this.pathGenerator.setPointLine(getBezierPointsLine(points, t))
        }




        this.renderPath()

        this.refreshPathLayer();

    }
}

const PathTransformEditor = class extends PathCutter {

    [EVENT('changePathTransform')] (transformMoveType) {
        this.resetTransformZone()

        var {width, height} = this.state.transformZoneRect;
        this.pathGenerator.initTransform(this.state.transformZoneRect);

        switch(transformMoveType) {
        case 'flipX':
            this.pathGenerator.transform('flipX', width, 0)     // rect 가운데를 기준으로 뒤집기 
            break; 
        case 'flipY':
            this.pathGenerator.transform('flipY', 0, height)    
            break;        
        case 'flip':
            this.pathGenerator.transform('flip', width, height)    
            break;                         
        }
        

        this.renderPath()

        this.refreshPathLayer();        
    }
        
    [POINTERSTART('$tool .transform-tool-item') + MOVE('moveTransformTool') + END('moveEndTransformTool')]  (e) {
        this.transformMoveType = e.$dt.attr('data-position')

        this.resetTransformZone()        
        this.pathGenerator.initTransform(this.state.transformZoneRect);
        this.startXY = e.xy; 
    }

    moveTransformTool (dx, dy) {

      
        this.pathGenerator.transform(this.transformMoveType, dx, dy);

        this.renderPath()

        this.refreshPathLayer();
    }

    moveEndTransformTool  (dx, dy) {
        this.transformMoveType = 'none'

        this.renderTransformTool();
    }
}

const FIELDS = ['fill', 'fill-opacity', 'stroke', 'stroke-width']

export default class PathEditorView extends PathTransformEditor {

    initialize() {
        super.initialize();

        this.pathParser = new PathParser();
        this.pathGenerator = new PathGenerator(this)
    }

    initState() {
        return {
            changeEvent: 'updatePathItem', 
            isShow: false,
            points: [],
            hasTransform: false, 
            mode: 'path',
            $target: null, 
            clickCount: 0,
            isSegment: false,
            isFirstSegment: false,
            screenX: Length.z(),
            screenY: Length.z(),
            screenWidth: Length.z(),
            screenHeight: Length.z()
        }
    }

    get scale () {
        return this.$editor.scale; 
    }

    template() {
        return /*html*/`
        <div class='path-editor-view' tabIndex="-1">
            <div class='path-container' ref='$view'></div>
            <div class='path-container split-panel'>
                <svg width="100%" height="100%">
                    <circle ref='$splitCircle' class='split-circle' />
                </svg>
            </div>
            <div class='path-tool'>
                <div class='transform-manager' ref='$tool'>
                    <div class='transform-tool-item' data-position='to rotate'></div>                
                    <div class='transform-tool-item' data-position='to move'></div>
                    <div class='transform-tool-item' data-position='to top'></div>
                    <div class='transform-tool-item' data-position='to right'></div>
                    <div class='transform-tool-item' data-position='to bottom'></div>
                    <div class='transform-tool-item' data-position='to left'></div>
                    <div class='transform-tool-item' data-position='to top right'></div>
                    <div class='transform-tool-item' data-position='to bottom right'></div>
                    <div class='transform-tool-item' data-position='to top left'></div>
                    <div class='transform-tool-item' data-position='to bottom left'></div>  
                </div>
            </div>
            <div class='segment-box' ref='$segmentBox'></div>
        </div>`
    }

    [BIND('$tool')] () {
        this.resetTransformZone();
        var rect = this.state.transformZoneRect;

        return {
            'data-show': this.state.mode === 'transform',
            'data-position': this.transformMoveType,
            style: {
                left: Length.px(rect.x),
                top: Length.px(rect.y),
                width: Length.px(rect.width),
                height: Length.px(rect.height)
            }

        }
    }

    renderTransformTool () {
        this.bindData('$tool')
    }

    isShow () {
        return this.state.isShow
    }

    initRect (isForce  = false) {
        if (!this.state.rect || isForce) {
            this.state.rect = this.parent.refs.$body.rect();
        }
    }

    [KEYUP('document') + IF('isShow') + ENTER + PREVENT + STOP] () {
        if (this.state.current) {
            this.refreshPathLayer();
            this.trigger('hidePathEditor');
        } else {     
            this.addPathLayer(); 
        }

        if (!this.state.current && this.state.points.length) {
            this.trigger('initPathEditorView');
        } else {
            this.trigger('hidePathEditor');
        }


    }

    [KEYUP('document') + IF('isShow') + ESCAPE + PREVENT + STOP] () {
        if (this.state.current) {
            this.refreshPathLayer();
        } else {     
            this.addPathLayer(); 
        }

        this.trigger('hidePathEditor');
    }    

    get totalPathLength () {
        if (!this.refs.$view) return 0 
        var $obj = this.refs.$view.$('path.object');
        if (!$obj) return 0; 

        return $obj.totalLength
    }

    makePathLayer (pathRect) {
        var { d } = this.pathGenerator.toPath(pathRect.x, pathRect.y, this.scale);
        var project = this.$selection.currentProject
        var layer; 
        if (project) {

            var x = pathRect.x / this.scale;
            var y = pathRect.y / this.scale;
            var width = pathRect.width / this.scale;
            var height = pathRect.height / this.scale; 

            layer = project.add(new SVGPathItem({
                width: Length.px(width),
                height: Length.px(height),
                d,
                totalLength: this.totalPathLength
            }));

            FIELDS.forEach(key => {
                if (this.state[key]) layer.reset({ [key]: this.state[key] })    
            });

            layer.setScreenX(x);
            layer.setScreenY(y);
        }

        return layer; 
    }

    get isBoxMode () {
        return this.state.box === 'box'
    }

    updatePathLayer () {
        var rect = this.getPathRect()

        var minX = rect.x;
        var minY = rect.y; 
        
        var item = this.state.current;

        // 객체 내부에 포함된 패스는 box 를 기준으로 재설정 
        if (item && this.isBoxMode) {
            var minX = item.screenX.value / this.scale 
            var minY = item.screenY.value / this.scale 
        }


        var { d } = this.pathGenerator.toPath(
            minX, 
            minY, 
            this.scale
        );

        var parser = new PathParser(d);

        this.emit(this.state.changeEvent, {
            d: parser.toString(), 
            totalLength: this.totalPathLength, 
            rect: {
                x: rect.x === 0? 0 : rect.x/this.scale,
                y: rect.y === 0? 0 : rect.y/this.scale,
                width: rect.width === 0? 0 : rect.width / this.scale,     // scale 이전의 크기 계산 
                height: rect.height === 0? 0 : rect.height / this.scale    // scale 이전의 실제 크기 계산 
            }
        })


        this.emit('refreshPathLayer')   // 외부 데이타 변경 시점 정의 
    }

    addPathLayer() {
        var pathRect = this.getPathRect()

        this.changeMode('modify');

        if (pathRect.width >  0 && pathRect.height > 0) {

            var layer = this.makePathLayer(pathRect)
            if (layer) {
                this.emit('refreshAll')
            }
        }
        
    }

    changeMode (mode, obj) { 
        this.setState({
            mode,
            clickCount: 0,
            moveXY: null,
            ...obj
        }, false)    

        this.emit('changePathManager', this.state.mode );
    }

    [EVENT('changePathManager')] (obj) {
        this.setState({ ...obj, clickCount: 0 }, false);
        this.renderPath()
    }

    isMode (mode) {
        return this.state.mode === mode; 
    }

    [EVENT('changeScale')] () {

        this.refresh();

    }

    getCurrentObject () {
        var current = this.state.current; 

        if (!current) {
            return null;
        }

        return {
            current,
            d: current.d,
            screenX: current.screenX,
            screenY: current.screenY,
            screenWidth: current.screenWidth,
            screenHeight: current.screenHeight,
        }
    }

    refresh (obj) {

        obj = obj || this.getCurrentObject();

        if (obj && obj.d) {
            this.pathParser.reset(obj.d)
            this.pathParser.scale(this.scale, this.scale);

            var x = obj.screenX.value * this.scale
            var y = obj.screenY.value * this.scale

            this.pathParser.translate(x, y)

            this.state.points = this.pathParser.convertGenerator();      
            this.state.hasTransform = !!obj.current.transform;
        } else {
            this.state.hasTransform = false;        
        }

        this.pathGenerator.initializeSelect();
        this.renderPath()

    }

    [EVENT('showPathEditor')] (mode = 'path', obj = {}) {

        if (mode === 'move') {
            obj.current = null;
            obj.points = [] 
        } else {
            if (!obj.current) {
                obj.current = null; 
            }
        }

        obj.box = obj.box || 'canvas'

        this.changeMode(mode, obj);

        this.refresh(obj);

        this.state.isShow = true; 
        this.$el.show();
        this.$el.focus();

        this.emit('showPathManager', { mode: this.state.mode });
        this.emit('hidePathDrawEditor');
        this.emit('change.mode.view', 'PathEditorView');        
    }

    [EVENT('hidePathEditor')] () {

        if (this.$el.isShow()) {
            this.pathParser.reset('');
            this.setState(this.initState(), false)
            this.refs.$view.empty()
            this.$el.hide();
            this.emit('finishPathEdit')
            this.emit('hidePathManager');            
            this.emit('change.mode.view');               
        }

    }


    [EVENT('hideAddViewLayer')] () {
        this.state.isShow = false;        
        this.pathParser.reset('');
        this.setState(this.initState(), false)        
        this.refs.$view.empty()
        this.$el.hide();
        this.emit('hidePathManager');        
    }

    [BIND('$view')] () {
        return {
            class: {
                'path': this.state.mode === 'path',
                'modify': this.state.mode === 'modify',
                'transform': this.state.mode === 'transform',
                'box': this.state.box === 'box',
                'has-transform': !!this.state.hasTransform,
                'segment-move': this.state.mode === 'segment-move',         
            },
            innerHTML: this.pathGenerator.makeSVGPath()
        }
    }

    [BIND('$splitCircle')] () {
        if (this.state.splitXY) {
            return {
                cx: this.state.splitXY.x,
                cy: this.state.splitXY.y,
                r: 5
            }
        } else {
            return {
                r: 0
            }
        }

    }

    refreshPathLayer () {
        this.updatePathLayer();
    }

    renderPath () {
        this.bindData('$view');

        this.renderTransformTool()
    }

    getPathRect () {
        this.initRect(true);

        var $obj = this.refs.$view.$('path.object')

        var pathRect = {x: 0, y: 0,  width: 0, height: 0}
        if ($obj) {

            pathRect = $obj.rect()
            pathRect.x -= this.state.rect.x;
            pathRect.y -= this.state.rect.y;
        }

        return pathRect;
    }

    resetTransformZone() {
        var rect = this.getPathRect();

        this.state.transformZoneRect = rect; 
    }

    [POINTERMOVE('$view')] (e) {        
        this.initRect()
        if (this.isMode('path') && this.state.rect) {            
            this.state.moveXY = {
                x: e.xy.x - this.state.rect.x, 
                y: e.xy.y - this.state.rect.y 
            }; 

            this.state.altKey = e.altKey
            this.renderPath()
        } else {

            var $target = Dom.create(e.target)
            var isSplitPath = $target.hasClass('split-path')
            if (isSplitPath) {
                this.state.splitXY = this.calculatePointOnLine($target.attr('d') ,{
                    x: e.xy.x - this.state.rect.x, 
                    y: e.xy.y - this.state.rect.y 
                }); 
            } else {
                this.state.splitXY = null; 
            }

            this.bindData('$splitCircle');

            this.state.altKey = false; 
        }

   
    }

    [POINTERSTART('$view :not(.split-path)') + MOVE() + END()] (e) {
        this.initRect();

        this.state.altKey = false; 
        var isPathMode = this.isMode('path');

        this.state.dragXY = {
            x: e.xy.x - this.state.rect.x, 
            y: e.xy.y - this.state.rect.y
        }; 
        this.state.isOnCanvas = false; 

        var $target = Dom.create(e.target);

        if ($target.hasClass('svg-editor-canvas') && !isPathMode) {
            this.state.isOnCanvas = true; 
            // return false; 
        } else {

            this.pathGenerator.reselect()
            this.state.isSegment = $target.attr('data-segment') === 'true';
            this.state.isFirstSegment = this.state.isSegment && $target.attr('data-is-first') === 'true';
            
        }

        if (isPathMode) {

            if (this.state.isFirstSegment) {
                // 마지막 지점을 연결할 예정이기 때문에 
                // startPoint 는  M 이었던 startPoint 로 정리된다. 
                var index = +$target.attr('data-index')
                this.state.startPoint = this.state.points[index].startPoint;
            } else {
                this.state.startPoint = this.state.dragXY;
    
            }
            this.state.dragPoints = false
            this.state.endPoint = null;


        } else {
            if (this.isOnCanvas) {
                this.renderSelectBox(this.state.dragXY);
            } else if (this.state.isSegment) {
                this.changeMode('segment-move');
                var [index, segmentKey] = $target.attrs('data-index', 'data-segment-point')
                this.pathGenerator.setCachePoint(+index, segmentKey);

                this.pathGenerator.selectKeyIndex(segmentKey, index)
            }
        }

    }

    hideSelectBox() {
        this.refs.$segmentBox.css({
            left: Length.px(-100000)
        })
    }

    renderSelectBox (startXY = null, dx = 0, dy = 0) {

        var obj = {
            left: Length.px(startXY.x + (dx < 0 ? dx : 0)),
            top: Length.px(startXY.y + (dy < 0 ? dy : 0)),
            width: Length.px(Math.abs(dx)),
            height: Length.px(Math.abs(dy))
        }        

        this.refs.$segmentBox.css(obj)


    }

    getSelectBox() {

        var [x, y, width, height ] = this.refs.$segmentBox
                .styles('left', 'top', 'width', 'height')
                .map(it => Length.parse(it))

        var rect = {
            x, 
            y, 
            width, 
            height
        }

        rect.x2 = Length.px(rect.x.value + rect.width.value);
        rect.y2 = Length.px(rect.y.value + rect.height.value);

        return rect; 
    }

    move (dx, dy) {

        if (this.state.isOnCanvas) {
            // 드래그 상자 만들기 
            this.renderSelectBox(this.state.dragXY, dx, dy);

        } else if (this.isMode('segment-move')) {
            var e = this.$config.get('bodyEvent')
            this.pathGenerator.move(dx, dy, e);

            this.renderPath()      

            this.updatePathLayer();

        } else if (this.isMode('path')) {
            var e = this.$config.get('bodyEvent');

            this.state.dragPoints = e.altKey ? false : true; 
        }
    }

    renderSegment (callback) {
        if (this.pathGenerator.selectedLength) {
            // reselect 로 이전 점들의 위치를 초기화 해줘야 한다. 꼭 
            this.pathGenerator.reselect()   
            // reselect 로 이전 점들의 위치를 초기화 해줘야 한다. 꼭 

            if (isFunction(callback)) callback();

            this.renderPath();

            this.updatePathLayer();
        }
    }

    [EVENT('deleteSegment')] () {
        // 특정 세그먼트만 삭제하기 
        this.renderSegment(() => {
            this.pathGenerator.removeSelectedSegment();
        })
    }

    [EVENT('moveSegment')] (dx, dy) {

        // segment 만 움직이기 
        this.renderSegment(() => {
            this.pathGenerator.moveSelectedSegment(dx, dy);
        })
    }


    [EVENT('initPathEditorView')] () {
        this.pathParser.reset('');
        this.setState(this.initState(), false)
        this.state.isShow = true; 
        this.refs.$view.empty()
        this.$el.focus();
    }

    end (dx, dy) {

        if (this.state.isOnCanvas) {
            if (dx === 0 &&  dy === 0) {    // 아무것도 움직인게 없으면 편집 종료 
                this.changeMode('modify');
                this.trigger('hidePathEditor')
            } else {
                // 움직였으면 drag 상자를 기준으로 좌표를 검색해서 선택한다. 
                // this.renderSelectBox(this.state.dragXY, dx, dy);
                this.changeMode('segment-move');
                this.pathGenerator.selectInBox(this.getSelectBox())
                this.renderPath()
                // 여기에 무엇을 할까? 
                this.hideSelectBox();
            }

        } else if (this.isMode('modify')) {
            // NOOP 

        } else if (this.isMode('segment-move')) {

            this.changeMode('modify');      
            // 마지막 지점에서 다시 renderpath 를 하게 되면 element 가 없어서 double 클릭을 인식 할 수가 없음. 
            // 그래서 삭제하니 이코드는 주석으로 그대로 나두자.      
            // this.renderPath()        

        } else if (this.isMode('path')) {            


            if (this.state.isFirstSegment) {
                this.changeMode('modify');            
                this.pathGenerator.setConnectedPoint(dx, dy);
        
                this.renderPath()
                   
                if (this.state.current) {
                    this.refreshPathLayer();
                } else {
                 
                    this.addPathLayer(); 
                    this.trigger('initPathEditorView')
                }
            } else {

                this.pathGenerator.moveEnd(dx, dy);
                this.state.clickCount++;

                this.renderPath()
            }

        }

    }   

} 