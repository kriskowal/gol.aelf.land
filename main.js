"use strict";

var Point2 = require("ndim/point2");
var Box2 = require("ndim/box2");
var Region2 = require("ndim/region2");
var xhr = require("./xhr");
var quadkey = require("./quadkey");

var zero2 = new Point2(0, 0);

module.exports = Main;

function Main(body, scope) {
    var self = this;
    this.generation = null;
    this.generationTime = null;
    this.generationPeriod = null;
    this.animator = scope.animator.add(this);
    this.position = new Point2(0, 0);
    this.viewportElement = null;
    this.originElement = null;
    this.viewportRegion = new Region2(this.position, new Point2());
    this.viewportBox = new Box2(this.position, new Point2());
    this.tileRegion = new Region2(new Point2(), new Point2());
    this.tileBox = new Box2(new Point2(), new Point2());
    this.tiles = {};
    this.repetition = null;
    this.freeTiles = [];
    this.counter = 0;
    self.boundUpdate = function boundUpdate(state) {
        self.handleLoaded(state);
    };
}

Main.prototype.tileSize = new Point2(256, 256);
Main.prototype.worldSize = new Point2(4, 4);

Main.prototype.hookup = function hookup(id, component, scope) {
    var method = "hookup" + id.slice(0, 1).toUpperCase() + id.slice(1);
    if (this[method]) {
        this[method](component, scope);
    }
};

Main.prototype.hookupThis = function hookupThis(self, scope) {
    var components = scope.components;
    this.viewportElement = components.viewport;
    this.dragger = new Dragger(this.viewportElement, this);
    this.originElement = components.origin;
    this.repetition = components.tiles;
};

Main.prototype["hookupTiles:iteration"] = function hookupTilesIteration(iteration, scope) {
    var tile = iteration.value;
    tile.canvas = scope.components.canvas;
    tile.context = tile.canvas.getContext("2d");
    tile.element = scope.components.tile;
    tile.parent = this;
};

Main.prototype.resize = function resize(size) {

    this.viewportRegion.size.become(size);
    this.viewportBox.copyFromRegion(this.viewportRegion);

    this.tileBox.start.become(zero2)
        .subThis(this.viewportBox.start)
        .subThis(this.tileSize)
        .divThis(this.tileSize)
        .floorThis();
    this.tileBox.end.become(zero2)
        .addThis(this.viewportBox.end)
        .addThis(this.tileSize)
        .divThis(this.tileSize)
        .ceilThis();

    this.tileBox.copyIntoRegion(this.tileRegion);

    this.animator.requestDraw();
};

Main.prototype.draw = function draw() {

    if (this.generation === null) {
        return;
    }

    // position of viewport
    this.viewportElement.style.top = this.viewportBox.start.y + 'px';
    this.viewportElement.style.bottom = this.viewportBox.end.y + 'px';
    this.viewportElement.style.left = this.viewportBox.start.x + 'px';
    this.viewportElement.style.right = this.viewportBox.end.x + 'px';

    // position of origin
    this.originElement.style.top = this.position.y + 'px';
    this.originElement.style.left = this.position.x + 'px';

    // TODO this.collect();
    var tilePosition = new Point2();
    var tileRegion = new Region2(tilePosition, new Point2(1, 1));
    var tileBox = new Box2(tilePosition, new Point2());
    for (tilePosition.y = this.tileBox.start.y; tilePosition.y <= this.tileBox.end.y; tilePosition.y++) {
        for (tilePosition.x = this.tileBox.start.x; tilePosition.x <= this.tileBox.end.x; tilePosition.x++) {
            tileBox.copyFromRegion(tileRegion);
            this.showTile(tileRegion, tileBox);
        }
    }
};

Main.prototype.redraw = function redraw() {
    this.requestGeneration();

    var keys = Object.keys(this.tiles);
    for (var index = 0; index < keys.length; index++) {
        var key = keys[index];
        var tile = this.tiles[key];
        tile.redraw();
    }
};

Main.prototype.showTile = function showTile(region, box) {
    if (
        region.position.x < 0 || region.position.x >= this.worldSize.x ||
        region.position.y < 0 || region.position.y >= this.worldSize.y
    ) {
        return;
    }
    var key = quadkey.encode(region, this.worldSize);
    var tile = this.tiles[key];
    if (!this.tiles[key]) {
        tile = new Tile();
        tile.key = key;
        this.repetition.value.push(tile);
        this.tiles[key] = tile;
    }
    tile.position.become(region.position).mulThis(this.tileSize);
    tile.update(this.generation);
};

Main.prototype.collect = function collect() {
    var keys = Object.keys(this.tiles);
    var region = new Region2(new Point2(), new Region2());
    var box = new Box2(new Point2(), new Point2());
    for (var index = 0; index < keys.length; index++) {
        var key = keys[index];
        quadkey.decodeInto(key, region, this.worldSize);
        box.copyFromRegion(region);
        if (!this.tileBox.contains(box)) {
            // TODO
        }
    }
};

Main.prototype.requestGeneration = function requestGeneration() {
    var self = this;
    xhr.get(new xhr.Request("http://localhost:6007/now.json"))
    .then(self.boundUpdate)
    .done();
};

Main.prototype.handleLoaded = function handleLoaded(stateJson) {
    var state = JSON.parse(stateJson);
    this.generation = state.iteration;
    this.generationPeriod = state.period;
    this.generationTime = Date.now();
    this.animator.requestDraw();
};

Main.prototype.focus = function focus() {
    this.requestGeneration();
};

function Tile() {
    this.key = null;
    this.position = new Point2();
    this.element = null;
    this.parent = null;
    this.image = new Image();
    this.image.onload = handleLoad;
    this.image.onerror = handleError;
    this.ok = false;

    var self = this;
    function handleLoad() {
        self.ok = true;
        self.handleLoad();
    }
    function handleError() {
        self.ok = false;
        self.handleLoad();
    }
}

Tile.prototype.update = function (generation) {
    this.element.style.left = this.position.x + 'px';
    this.element.style.top = this.position.y + 'px';
    this.image.src = "http://localhost:6007/g" + generation + "t" + this.key + ".png?" + Math.random().toString(36).slice(2);
    this.parent.counter++;
};

Tile.prototype.handleLoad = function () {
    this.parent.counter--;
    if (this.parent.counter === 0) {
        this.parent.redraw();
    }
};

Tile.prototype.redraw = function () {
    if (this.ok) {
        this.context.drawImage(this.image, 0, 0);
    }
};


function Dragger(element, delegate) {
    this.element = element;
    this.delegate = delegate; // handleMove, handleDown, handleUp
    this.isDown = false;
    this.element.addEventListener("mousedown", this);
}

Dragger.prototype.destroy = function destroy() {
};

Dragger.prototype.handleEvent = function handleEvent(event) {
    var methodName = "handle" + event.type.slice(1).toUpperCase() + event.type.slice(1);
    if (this[methodName]) {
        this[methodName](event);
    }
};

Dragger.prototype.handleMousedown = function handleMousedown(event) {
    console.log('x');
};
