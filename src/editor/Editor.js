

import i18n from "../csseditor/i18n";
import theme from "../csseditor/ui/theme";

import { TimelineSelectionManager } from "./manager/TimelineSelectionManager";
import { SelectionManager } from "./manager/SelectionManager";
import { ComponentManager } from "./manager/ComponentManager";
import { CommandManager } from "./manager/CommandManager";
import { ShortCutManager } from "./manager/ShortCutManager";
import { ConfigManager } from "./manager/ConfigManager";

import AssetParser from "./parse/AssetParser";
import { isArray, isObject, isString, isFunction } from "../util/functions/func";
import commands from "../csseditor/commands";
import shortcuts from "../csseditor/shortcuts";


export const EDITOR_ID = "";

export const EDIT_MODE_SELECTION = 'SELECTION';
export const EDIT_MODE_ADD = 'ADD';

const DEFAULT_THEME = 'dark' 


export class Editor {
  constructor(opt = {}) {
    this.config = new ConfigManager(this);
    this.commands = new CommandManager(this);
    this.shortcuts = new ShortCutManager(this);
    this.selection = new SelectionManager(this);
    this.timeline = new TimelineSelectionManager(this);
    this.components = ComponentManager;

    this.projects = []     
    this.popupZIndex = 10000;
    this.canvasWidth = 100000;
    this.canvasHeight = 100000;
    this.scale = 1
    this.symbols = {}
    this.images = {}
    this.openRightPanel = true; 
    this.mode = EDIT_MODE_SELECTION
    this.modeView = 'CanvasView';
    this.addComponentType = '' 
    this.locale = this.loadItem('locale') || 'en_US'
    this.layout = this.loadItem('layout') || 'all'    
    this.$store = opt.$store;

    this.initTheme();
    this.loadCommands();
    this.loadShortCuts();
  }

  loadCommands() {
    Object.keys(commands).forEach(command => {
      if (isFunction(commands[command])) {
        this.commands.registerCommand(command, commands[command]);
      } else {
        this.commands.registerCommand(commands[command])
      }

    })
  }

  loadShortCuts() {
    shortcuts.forEach(shortcut => {
      this.shortcuts.registerShortCut(shortcut);
    })

    this.shortcuts.sort()
  }  

  i18n (key, params = {}, locale) {
    return i18n.get(key, params, locale || this.locale)
  }

  hasI18nkey (key, locale) {
    return i18n.hasKey(key, locale || this.locale)
  }

  initI18n (root = '') {
    return (key, params = {}, locale) => {

      const i18nKey  = `${root}.${key}`;
      if (this.hasI18nkey(i18nKey, locale)) {
        return this.$i18n(`${root}.${key}`, params, locale)
      } else {
        return this.$i18n(`${key}`, params, locale)
      }

    }
  }

  setLocale (locale = 'en_US') {
    this.locale = locale; 
    this.saveItem('locale', this.locale);    
  }

  setLayout (layout = 'all') {
    this.layout = layout; 
    this.saveItem('layout', this.layout);    
  }  

  setUser (user) {
    this.user = user; 
  }

  initTheme () {
    var theme = DEFAULT_THEME

    if (window.localStorage) {
      theme = window.localStorage.getItem('easylogic.studio.theme')

      theme = ['dark', 'light', 'toon'].includes(theme) ? theme : DEFAULT_THEME;
    }

    this.theme =  theme || DEFAULT_THEME
    window.localStorage.setItem('easylogic.studio.theme', this.theme);
  }

  themeValue (key, defaultValue = '') {
    return theme[this.theme][key] || defaultValue;
  }

  changeMode (mode = EDIT_MODE_SELECTION) {
    this.mode = mode;   // add or selection  
  }

  changeModeView (modeView = 'CanvasView') {
    this.modeView = modeView;
  }

  isMode (mode) {
    return this.mode === mode; 
  }

  isAddMode () {
    return this.isMode(EDIT_MODE_ADD)
  }

  isSelectionMode () {
    return this.isMode(EDIT_MODE_SELECTION);
  }

  changeAddType (type = '', isComponent = false) {
    this.changeMode(EDIT_MODE_ADD);
    this.addComponentType = type;
    this.isComponent = isComponent
  }

  changeTheme (theme) {
    theme = ['light', 'toon'].includes(theme) ? theme: 'dark';

    this.theme = theme; 
    window.localStorage.setItem('easylogic.studio.theme', theme);
  }

  // 팝업의 zindex 를 계속 높여 주어 
  // 최근에 열린 팝업이 밑으로 가지 않게 한다. 
  get zIndex () {
    return this.popupZIndex++
  }

  getFile (url) {
    return this.images[url] || url;
  }

  setStore($store) {
    this.$store = $store;
  }

  send(...args) {
    this.emit(...args);
  }

  emit(...args) {
    if (this.$store) {
      this.$store.source = "EDITOR_ID";
      this.$store.emit(...args);
    }
  }

  load (projects = []) {
    this.projects = projects
  }

  /**
   * add item
   *
   * @param {string} parentId
   * @param {Item} item
   * @return {Item}
   */
  add(item) {
    this.projects.push(item);
    return item;
  }

  /**
   * remove Item  with all children
   *
   * @param {string} id
   */
  remove(index) {
    this.projects.splice(index, 1);
  }

  clear() {
    this.projects = [];
  }

  /**
   * get item
   *
   * @param {String} key
   */
  get(index) {
    return this.projects[index];
  }


  replaceLocalUrltoRealUrl (str) {

    var project = this.selection.currentProject;
    var images = {} 

    project.images.forEach(a => {
      if (str.indexOf(a.local) > -1) { 
        images[a.local]  = a.original
      }
    })

    Object.keys(images).forEach(local => {
        if (str.indexOf(local) > -1) {
            str = str.replace(new RegExp(local, 'g'), images[local])
        }
    })
    
    return str; 
  }

  replaceLocalUrltoId (str) {

    var projects = this.projects;
    var images = {} 

    projects.forEach(project => {

        project.images.forEach(a => {
            if (str.indexOf(a.local) > -1) { 
                images[a.local]  = '#' + a.id
            }
        })
    })


    Object.keys(images).forEach(local => {
        if (str.indexOf(local) > -1) {
            str = str.replace(new RegExp(local, 'g'), images[local])
        }
    })

    return str; 
  }

  makeResource (json) {
    var result = JSON.stringify(json)

    // image check 
    result = this.replaceLocalUrltoId(result);

    return result;
  }


  saveResource (key, value) {
    window.localStorage.setItem(`easylogic.studio.${key}`, this.makeResource(value));
  }

  saveItem (key, value) {
    window.localStorage.setItem(`easylogic.studio.${key}`, JSON.stringify(value));
  }


  /**
   * 
   * recover origin to local blob url for Asset 
   * 
   * @param {string} value JSON String for project list 
   */
  revokeResource (value) {
    var json = JSON.parse(value || '[]');
    var assets = {} 

    json.forEach(project => {
        project.images.forEach(it => {
            assets[`#${it.id}`] = it; 
        })
    })

    Object.keys(assets).map(idString => {
        var a = assets[idString];
        var info = AssetParser.parse(a.original, true);
        a.local = info.local;
    })

    json.forEach(project => {
        project.layers = this.applyAsset(project.layers, assets);
    })

    return json; 
  }


  applyAsset (json, assets) {
    if (isArray(json)) {
        json = json.map(it => this.applyAsset(it, assets))
    } else if (isObject(json)) {
        Object.keys(json).forEach(key => {
            json[key] = this.applyAsset(json[key], assets);
        }) 
    } else if (isString(json)) {

        Object.keys(assets).forEach(idString => {
            var a = assets[idString]
            if (json.indexOf(`#${a.id}`) > -1) {
                json = json.replace(new RegExp(`#${a.id}`, 'g'), a.local);
            }

        })
    }

    return json; 
  }


  loadResource (key) {
    return this.revokeResource(window.localStorage.getItem(`easylogic.studio.${key}`))
  }

  loadItem (key) {
    return JSON.parse(window.localStorage.getItem(`easylogic.studio.${key}`) || JSON.stringify(""))
  }  

  
}