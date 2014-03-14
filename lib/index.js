exports.renderer = renderer;
exports.compose = compose;
exports.templating = require("./templating");

var events = require("events");

var _ = require("underscore");

var promises = require("./promises");

function renderer(options) {
    var parts = options.parts;
    var generateHash = options.generateHash || require("./hashes").generateHash;
    
    function render(partName, context, holeName) {
        return renderPart(partName, context).then(function(result) {
            return renderedPartToFilledHole({
                name: holeName || partName,
                part: partName,
                context: context,
                result: result
            });
        });
    }
    
    function update(partName, context, element) {
        var hash = generateHash({
            name: element.getAttribute("data-hole-name"),
            part: partName,
            context: context
        });
        
        var oldHash = element.getAttribute("data-hole-hash");
        if (hash === oldHash) {
            return;
        }
        
        var updateToken = Math.random().toString();
        element.setAttribute("data-hole-update-token", updateToken);
        
        renderer.emit("beforeUpdate", {element: element});
        
        function updatePart(renderResult) {
            if (element.getAttribute("data-hole-update-token") !== updateToken) {
                return;
            }
            element.setAttribute("data-hole-hash", hash);
            renderer.emit("afterUpdateSelf", {element: element});
            if (_.isString(renderResult)) {
                element.innerHTML = renderResult;
            } else {
                return promises.all(_.map(renderResult.parts, function(part) {
                    var name = part.name || part.part;
                    var holeElement = findChildHoleElement(element, name);
                    return update(part.part, part.context, holeElement);
                }));
            }
        }
        
        function findChildHoleElement(parentElement, holeName) {
            var holeElements = element.querySelectorAll("div[data-hole-name='" + holeName + "']");
            
            function isChildPart(holeElement) {
                var parent = holeElement.parentNode;
                while (parent && parent !== element) {
                    if (parent.hasAttribute("data-hole-name")) {
                        return false;
                    }
                    parent = parent.parentNode;
                }
                return true;
            }
            
            return _.find(holeElements, isChildPart);
        }
        
        return renderPartShallow(partName, context)
            .then(updatePart)
            .then(function() {
                renderer.emit("afterUpdate", {element: element});
            });
    }
    
    function renderPart(partName, context) {
        return renderPartShallow(partName, context).then(function(renderResult) {
            if (_.isString(renderResult)) {
                return renderResult;
            } else {
                var part = findPartByName(partName);
                return renderComposedRequest(part, renderResult);
            }
        });
    }
    
    function renderPartShallow(partName, context) {
        var part = findPartByName(partName);
        if (part) {
            return promises.when(part.render(partName, context));
        } else {
            return promises.reject(new Error("Unknown part: " + partName));
        }
    }
    
    function findPartByName(partName) {
        return _.find(parts, function(part) {
            return part.name === partName;
        });
    }
    
    function renderComposedRequest(part, composedRequest) {
        var renderedPartsPromise = composedRequest.parts.map(function(partRequest) {
            return render(partRequest.part, partRequest.context, partRequest.name)
                .then(function(value) {
                    return {holeName: partRequest.name, value: value};
                });
        });
        return promises.all(renderedPartsPromise).then(function(renderedParts) {
            if (part.template) {
                var holeContents = {};
                renderedParts.forEach(function(renderedPart) {
                    holeContents[renderedPart.holeName] = renderedPart.value;
                });
                
                return part.template.fillHoles(holeContents);
            } else {
                return _.pluck(renderedParts, "value").join("");
            }
        });
    }

    function renderedPartToFilledHole(renderedPart) {
        var hash = generateHash({
            name: renderedPart.name,
            part: renderedPart.part,
            context: renderedPart.context
        }).replace(/"/g, "&quot;");
        return '<div data-hole-name="' + renderedPart.name + '" data-hole-hash="' + hash + '">' + renderedPart.result + '</div>';
    }
    
    var renderer = new events.EventEmitter();
    renderer.render = render;
    renderer.update = update;
    
    return renderer;
}

    
function compose(partRequests, func) {
    return {
        parts: partRequests,
        func: func
    };
}
