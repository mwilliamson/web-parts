var _ = require("underscore");
var url = require("url");

var handler = require("./handler");


function updatePart(href, element) {
    var request = handler.parseRequest(url.parse(href));
    handler.renderer.update(request.partName, request.context, element).done();
}

var topPartElement = document.querySelector("body > div");
topPartElement.addEventListener("click", function(event) {
    var target = event.target;
    if (target.tagName === "A") {
        updatePart(target.href, topPartElement);
        history.pushState({}, "", target.href);
        event.preventDefault();
        return false;
    }
}, false);
