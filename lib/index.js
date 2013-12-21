exports.renderer = renderer;
exports.compose = compose;

var q = require("q");
var _ = require("underscore");
var hashes = require("./hashes");

function renderer(options) {
    var templater = options.templater;
    var partDefinitions = options.parts;
    
    function renderTemplate(name, context) {
        return q.when(templater(name, context));
    }
    
    function render(name, context) {
        var partDefinition = _.find(partDefinitions, function(definition) {
            return definition.name === name;
        });
        if (partDefinition) {
            return q.when(partDefinition.render(name, context), function(renderResult) {
                if (_.isString(renderResult)) {
                    return renderResult;
                } else {
                    return renderComposedRequest(partDefinition, renderResult);
                }
            });
        } else {
            return q.when(null);
        }
    }
    
    function renderComposedRequest(partDefinition, composedRequest) {
        var renderedPartsPromise = composedRequest.parts.map(function(partRequest) {
            return render(partRequest.part, partRequest.context).then(function(result) {
                return {
                    name: partRequest.name || partRequest.part,
                    part: partRequest.part,
                    context: partRequest.context,
                    result: result
                };
            });
        });
        return q.all(renderedPartsPromise).then(function(renderedParts) {
            var wrappedParts = renderedParts.map(function(renderedPart) {
                var hash = hashes.generateHash({
                    name: renderedPart.name,
                    part: renderedPart.part,
                    context: renderedPart.context
                });
                return {
                    name: renderedPart.name,
                    value: '<div data-hole-name="' + renderedPart.name + '" data-hole-hash="' + hash + '">' + renderedPart.result + '</div>'
                };
            });
            if (partDefinition.template) {
                var holeRegex = /<!--\s*HOLE:\s*(\S+)\s*-->/g;
                return partDefinition.template.replace(holeRegex, function(match, holeName) {
                    return _.find(wrappedParts, function(wrappedPart) {
                        return wrappedPart.name === holeName;
                    }).value;
                });
            } else {
                return _.pluck(wrappedParts, "value").join("");
            }
        });
    }
    
    return {
        render: render
    };
}

    
function compose(partRequests, func) {
    return {
        parts: partRequests,
        func: func
    };
}
