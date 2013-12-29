exports.renderer = renderer;
exports.compose = compose;
exports.commentsTemplate = commentsTemplate;

var q = require("q");
var _ = require("underscore");
var hashes = require("./hashes");

function renderer(options) {
    var partDefinitions = options.parts;
    
    function render(partName, context, holeName) {
        var partDefinition = _.find(partDefinitions, function(definition) {
            return definition.name === partName;
        });
        if (partDefinition) {
            return q.when(partDefinition.render(partName, context), function(renderResult) {
                if (_.isString(renderResult)) {
                    return renderResult;
                } else {
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
        } else {
            return q.reject(new Error("Unknown part: " + partName));
        }
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
        render: render
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
