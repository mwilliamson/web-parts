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
                    return renderComposedRequest(renderResult);
                }
            });
        } else {
            return q.when(null);
        }
    }
    
    function renderComposedRequest(composedRequest) {
        var renderedPartsPromise = composedRequest.parts.map(function(partRequest) {
            return render(partRequest.name, partRequest.context).then(function(result) {
                return {
                    name: partRequest.name,
                    context: partRequest.context,
                    result: result
                };
            });
        });
        return q.all(renderedPartsPromise).then(function(renderedParts) {
            var wrappedParts = renderedParts.map(function(renderedPart) {
                var hash = hashes.generateHash({
                    name: renderedPart.name,
                    context: renderedPart.context
                });
                return '<div data-part-hash="' + hash + '">' + renderedPart.result + '</div>'
            });
            return wrappedParts.join("");
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
