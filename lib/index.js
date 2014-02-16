exports.renderer = renderer;
exports.compose = compose;
exports.commentsTemplate = commentsTemplate;

var events = require("events");

var q = require("q");
var _ = require("underscore");
var hashes = require("./hashes");

function renderer(options) {
    var partDefinitions = options.parts;
    
    function render(partName, context, holeName) {
        return renderPart(partName, context).then(function(renderResult) {
            if (_.isString(renderResult)) {
                return renderResult;
            } else {
                var partDefinition = findPartDefinition(partName);
                return renderComposedRequest(partDefinition, renderResult);
            }
        }).then(function(result) {
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
                return q.all(_.map(renderResult.parts, function(part) {
                    var name = part.name || part.part;
                    var holeElements = element.querySelectorAll("div[data-hole-name='" + name + "']");
                    
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
                    
                    var holeElement = _.find(holeElements, isChildPart);
                    
                    return update(part.part, part.context, holeElement);
                }));
            }
        }
        
        return renderPart(partName, context)
            .then(updatePart)
            .then(function() {
                renderer.emit("afterUpdate", {element: element});
            });
    }
    
    function renderPart(partName, context) {
        var partDefinition = findPartDefinition(partName);
        if (partDefinition) {
            return q.when(partDefinition.render(partName, context));
        } else {
            return q.reject(new Error("Unknown part: " + partName));
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
        return q.all(renderedPartsPromise).then(function(renderedParts) {
            if (partDefinition.template) {
                var holeContents = {};
                renderedParts.forEach(function(renderedPart) {
                    holeContents[renderedPart.holeName] = renderedPart.value;
                });
                
                var holeRegex = /<!--\s*HOLE:\s*(\S+)\s*-->/g;
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


function commentsTemplate(sourceString) {
    return {
        fillHoles: function(holeMap) {
            var holeRegex = /<!--\s*HOLE:\s*(\S+)\s*-->/g;
            return sourceString.replace(holeRegex, function(match, holeName) {
                return holeMap[holeName];
            });
        }
    };
}
