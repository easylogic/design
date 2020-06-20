import clipboardCopy from "./clipboard.copy";
import clipboardPaste from "./clipboard.paste";
import itemMoveShiftLeft from "./item.move.shift.left";
import itemMoveKeyLeft from "./item.move.key.left";
import itemMoveKeyRight from "./item.move.key.right";
import itemMoveKeyDown from "./item.move.key.down";
import itemMoveKeyUp from "./item.move.key.up";
import itemMoveShiftDown from "./item.move.shift.down";
import itemMoveShiftRight from "./item.move.shift.right";
import itemMoveShiftUp from "./item.move.shift.up";
import itemMoveAltLeft from "./item.move.alt.left";
import itemMoveAltDown from "./item.move.alt.down";
import itemMoveAltRight from "./item.move.alt.right";
import itemMoveAltUp from "./item.move.alt.up";
import itemDelete from "./item.delete";
import segmentMoveKeyDown from "./segment.move.key.down";
import segmentMoveKeyUp from "./segment.move.key.up";
import segmentMoveKeyRight from "./segment.move.key.right";
import segmentMoveKeyLeft from "./segment.move.key.left";
import segmentMoveShiftDown from "./segment.move.shift.down";
import segmentMoveShiftUp from "./segment.move.shift.up";
import segmentMoveShiftLeft from "./segment.move.shift.left";
import segmentMoveAltDown from "./segment.move.alt.down";
import segmentMoveAltUp from "./segment.move.alt.up";
import segmentMoveAltLeft from "./segment.move.alt.left";
import segmentMoveAltRight from "./segment.move.alt.right";
import segmentMoveShiftRight from "./segment.move.shift.right";
import segmentDelete from "./segment.delete";
import scaleMinus from "./scale.minus";
import scalePlus from "./scale.plus";
import addRect from "./add.rect";
import selectView from "./select.view";
import addRectM from "./add.rect.m";
import addCircle from "./add.circle";
import addCircleL from "./add.circle.l";
import addText from "./add.text";
import addPath from "./add.path";
import addBrush from "./add.brush";
import selectArtboard from "./select.artboard";



export default [
    // add layer 
    selectView,
    selectArtboard,
    addRect,
    addRectM,
    addCircle,
    addCircleL,
    addText,
    addPath,
    addBrush,

    // move segment by arrow key 
    segmentMoveKeyDown,
    segmentMoveKeyUp,
    segmentMoveKeyRight,
    segmentMoveKeyLeft,

    segmentMoveShiftDown,
    segmentMoveShiftUp,
    segmentMoveShiftLeft,
    segmentMoveShiftRight,

    segmentMoveAltDown,
    segmentMoveAltUp,
    segmentMoveAltLeft,
    segmentMoveAltRight,

    segmentDelete,

    // move item by arrow key 
    itemMoveKeyLeft,
    itemMoveKeyRight,
    itemMoveKeyDown,
    itemMoveKeyUp,

    // move item by shift key
    itemMoveShiftDown,
    itemMoveShiftRight,
    itemMoveShiftUp,
    itemMoveShiftLeft,

    // move item by alt key
    itemMoveAltLeft,
    itemMoveAltDown,
    itemMoveAltRight,
    itemMoveAltUp,

    // 
    itemDelete,

    // zoom
    scaleMinus,
    scalePlus,    

    // clipboard 
    clipboardCopy,
    clipboardPaste
]