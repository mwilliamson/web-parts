exports.renderer = renderer;
exports.compose = compose;

var q = require("q");
var _ = require("underscore");
var crypto = require("crypto");

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
                var hash = generateHash({
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

function generateHash(topValue) {
    var hash = crypto.createHash("sha1");
    
    function recurse(value) {
        if (_.isString(value)) {
            hash.update(value);
        } else if (_.isObject(value)) {
            var pairs = _.sortBy(_.pairs(value), function(value) {
                return value[0];
            });
            pairs.forEach(function(pair) {
                hash.update(pair[0]);
                recurse(pair[1]);
            });
        } else {
            throw new Error("Unhandled value");
        }
    }
    
    recurse(topValue);
    
    return hash.digest("hex");
}
