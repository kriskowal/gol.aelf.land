"use strict";

var Q = require("q");

exports.Request = Request;
function Request(location) {
    this.location = location;
    this.contentType = null;
}

exports.get = get;
function get(request) {

    var xhr = new XMLHttpRequest();
    var response = Q.defer();

    function onload() {
        if (xhrSuccess(xhr)) {
            response.resolve(xhr.responseText);
        } else {
            onerror();
        }
    }

    function onerror() {
        var error = new Error("Can't XHR " + JSON.stringify(request.location));
        if (xhr.status === 404 || xhr.status === 0) {
            error.code = "ENOENT";
            error.notFound = true;
        }
        response.reject(error);
    }

    try {
        xhr.open("GET", request.location, true);
        if (request.contentType && xhr.overrideMimeType) {
            xhr.overrideMimeType(contentType);
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                onload();
            }
        };
        xhr.onload = xhr.load = onload;
        xhr.onerror = xhr.error = onerror;
        xhr.send();
    } catch (exception) {
        response.reject(exception);
    }

    return response.promise;
};

// Determine if an XMLHttpRequest was successful
// Some versions of WebKit return 0 for successful file:// URLs
function xhrSuccess(req) {
    return (req.status === 200 || (req.status === 0 && req.responseText));
}
