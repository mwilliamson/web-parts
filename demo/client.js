var _ = require("underscore");
var url = require("url");

var handler = require("./handler");


function updatePart(href, element) {
    var request = handler.parseRequest(url.parse(href));
    handler.renderer.update(request.partName, request.context, element).done();
}

var anchorElements = document.getElementsByTagName("a");

_.forEach(anchorElements, function(element) {
    element.addEventListener("click", function(event) {
        updatePart(element.href, document.querySelector("body > div"));
        event.preventDefault();
        return false;
    }, false);
});
