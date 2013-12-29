var _ = require("underscore");

var handler = require("./handler");


function updatePart(partName, context, element) {
    // TODO: parse request from click handler
    handler.renderer.update(partName, context, element).done();
}

var anchorElements = document.getElementsByTagName("a");

_.forEach(anchorElements, function(element) {
    element.addEventListener("click", function(event) {
        updatePart("parts/body", {pageNumber: 2}, document.querySelector("body > div"));
        event.preventDefault();
        return false;
    }, false);
});
