exports.renderer = renderer;
exports.compose = compose;
exports.commentsTemplate = commentsTemplate;

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
        return renderPart(partName, context).then(function(renderResult) {
            var hash = hashes.generateHash({
                name: element.getAttribute("data-hole-name"),
                part: partName,
                context: context
            });
            var oldHash = element.getAttribute("data-hole-hash");
            if (hash === oldHash) {
                return;
            }
            // TODO: update data- attributes accordingly
            if (_.isString(renderResult)) {
                element.innerHTML = renderResult;
            } else {
                return q.all(_.map(renderResult.parts, function(part) {
                    // TODO: check that there aren't any intermediate elements with data-part-name (should be a direct child in terms of parts)
                    var name = part.name || part.part;
                    var holeElement = element.querySelector("div[data-hole-name='" + name + "']");
                    return update(part.part, part.context, holeElement);
                }));
            }
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
    
    return {
        render: render,
        update: update
    };
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
