exports.parseRequest = parseRequest;
exports.renderRequest = renderRequest;
exports.renderer = renderer;

var url = require("url");

var renderer = exports.renderer = require("./parts").renderer;

function parseRequest(request) {
    var urlRegexResult = /\/page\/([0-9]+)/.exec(url.parse(request.url).pathname);
    var pageContext = {pageNumber: urlRegexResult ? urlRegexResult[1] : 1};
    return {
        partName: "parts/body",
        context: pageContext
    };
}

function renderRequest(request) {
    var partsRequest = parseRequest(request);
    return renderer.render(partsRequest.partName, partsRequest.context);
}
