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

handler.renderer.on("beforeUpdate", function(event) {
    addOverlay($(event.element));
});

handler.renderer.on("afterUpdateSelf", function(event) {
    removeOverlay($(event.element));
});

var overlayClass = "web-parts-overlay";
var relativeClass = "web-parts-overlay-relative";

function addOverlay(element) {
    removeOverlay(element);
    
    if (element.css("position") === "static") {
        element.addClass(relativeClass);
    }
    var offset = element.offset();
    var overlayElement = $(document.createElement("div"));
    overlayElement.addClass(overlayClass);
    overlayElement.text("Loading...");
    overlayElement.css({
        position: "absolute",
        left: 0,
        top: 0,
        width: element.outerWidth(),
        height: element.outerHeight(),
        opacity: 0.9,
        backgroundColor: "#ccc"
    });
    element.append(overlayElement);
}

function removeOverlay(element) {
    element.find("." + overlayClass).remove();
    element.removeClass(relativeClass);
}
