exports.parseRequest = parseRequest;
exports.renderRequest = renderRequest;
exports.renderer = renderer;

var renderer = exports.renderer = require("./parts").renderer;

function parseRequest(url) {
    var urlRegexResult = /\/page\/([0-9]+)/.exec(url.pathname);
    var pageContext = {pageNumber: urlRegexResult ? urlRegexResult[1] : 1};
    return {
        partName: "parts/body",
        context: pageContext
    };
}

function renderRequest(url) {
    var partsRequest = parseRequest(url);
    return renderer.render(partsRequest.partName, partsRequest.context);
}
