var http = require("http");
var url = require("url");
var path = require("path");

var browserify = require("browserify");

var handler = require("./handler");

function main() {
    http.createServer(function(request, response) {
        var parsedUrl = url.parse(request.url);
        if (parsedUrl.pathname === "/client.js") {
            browserify(path.join(__dirname, "client.js")).bundle(function(error, clientJavaScript) {
                response.writeHead(200, {"content-type": "application/javascript"});
                response.end(clientJavaScript);
            });
        } else {
            handler.renderRequest(parsedUrl).then(function(bodyHtml) {
                response.writeHead(200, {"content-type": "text/html"});
                response.end(renderPage(bodyHtml))
            }).done();
        }
    }).listen(8090);
}

main();

function renderPage(bodyHtml) {
    return '<!DOCTYPE html>' + 
        '<html>' +
        '  <body>' +
        bodyHtml +
        '  </body>' +
        '</html>';
}
