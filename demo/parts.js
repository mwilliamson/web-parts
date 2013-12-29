var webParts = require("../");

var bodyTemplate = webParts.commentsTemplate(
    '<h1>Front page</h1>' +
    '<a href="/pages/2">Next page</a>' +
    '<!-- HOLE: main -->' +
    '<script src="/client.js"></script>'
);

var parts = [
    {
        name: "parts/body",
        render: function(name, context) {
            return webParts.compose([
                {name: "main", part: "parts/results", context: context}
            ]);
        },
        template: bodyTemplate  
    },
    {
        name: "parts/results",
        render: function(name, context) {
            return "<h2>Page " + context.pageNumber + "</h2>";
        }
    }
];

exports.renderer = webParts.renderer({parts: parts});
