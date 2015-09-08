"use strict";

var Document = require("gutentag/document");
var Scope = require("gutentag/scope");
var Attention = require("kamera");
var Animator = require("blick");
var Point2 = require("ndim/point2");
var Main = require("./main.html");

var scope = new Scope();
var bodyDocument = new Document(window.document.body);
scope.animator = new Animator();
scope.attention = new Attention();
scope.main = new Main(bodyDocument.documentElement, scope);
scope.main.focus();

var size = new Point2();
window.addEventListener("resize", handleResize);
function handleResize() {
    size.x = Math.max(
        window.document.documentElement.clientWidth,
        window.innerWidth || 0);
    size.y = Math.max(
        window.document.documentElement.clientHeight,
        window.innerHeight || 0);
    scope.main.resize(size);
}
handleResize();
