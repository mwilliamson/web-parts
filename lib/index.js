exports.renderer = renderer;
exports.compose = compose;
exports.templating = require("./templating");

var events = require("events");

var _ = require("underscore");

var promises = require("./promises");
var hashes = require("./hashes");

function renderer(options) {
    var partDefinitions = options.parts;
    
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
        var hash = hashes.generateHash({
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
                var partDefinition = findPartDefinition(partName);
                return renderComposedRequest(partDefinition, renderResult);
            }
        });
    }
    
    function renderPartShallow(partName, context) {
        var partDefinition = findPartDefinition(partName);
        if (partDefinition) {
            return promises.when(partDefinition.render(partName, context));
        } else {
            return promises.reject(new Error("Unknown part: " + partName));
        }
    }
    
    function findPartDefinition(partName) {
        return _.find(partDefinitions, function(definition) {
            return definition.name === partName;
        });
    }
    
    function renderComposedRequest(partDefinition, composedRequest) {
        var renderedPartsPromise = composedRequest.parts.map(function(partRequest) {
            return render(partRequest.part, partRequest.context, partRequest.name)
                .then(function(value) {
                    return {holeName: partRequest.name, value: value};
                });
        });
        return promises.all(renderedPartsPromise).then(function(renderedParts) {
            if (partDefinition.template) {
                var holeContents = {};
                renderedParts.forEach(function(renderedPart) {
                    holeContents[renderedPart.holeName] = renderedPart.value;
                });
                
                return partDefinition.template.fillHoles(holeContents);
            } else {
                return _.pluck(renderedParts, "value").join("");
            }
        });
    }
    
    var renderer = new events.EventEmitter();
    renderer.render = render;
    renderer.update = update;
    
    return renderer;
}

function renderedPartToFilledHole(renderedPart) {
    var hash = hashes.generateHash({
        name: renderedPart.name,
        part: renderedPart.part,
        context: renderedPart.context
    });
    return '<div data-hole-name="' + renderedPart.name + '" data-hole-hash="' + hash + '">' + renderedPart.result + '</div>';
}

    
function compose(partRequests, func) {
    return {
        parts: partRequests,
        func: func
    };
}
