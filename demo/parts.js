var webParts = require("../");
var q = require("q");

var bodyTemplate = webParts.commentsTemplate(
    '<h1>Front page</h1>' +
    '<!-- HOLE: nav -->' +
    '<!-- HOLE: main -->' +
    '<script src="http://code.jquery.com/jquery-1.11.0.min.js"></script>' +
    '<script src="/client.js"></script>'
);

var parts = [
    {
        name: "parts/body",
        render: function(name, context) {
            return webParts.compose([
                {name: "nav", part: "parts/nav", context: context},
                {name: "main", part: "parts/results", context: context}
            ]);
        },
        template: bodyTemplate  
    },
    {
        name: "parts/nav",
        render: function(name, context) {
            var output = '';
            var pageNumber = parseInt(context.pageNumber, 10);
            if (pageNumber > 1) {
                output += '<p><a href="/page/' + (pageNumber - 1) + '">Previous page</a></p>';
            }
            output += '<p><a href="/page/' + (pageNumber + 1) + '">Next page</a></p>';
            return output;
        }
    },
    {
        name: "parts/results",
        render: function(name, context) {
            var deferred = q.defer();
            
            setTimeout(function() {
                deferred.resolve("<h2>Page " + context.pageNumber + "</h2>");
            }, 1000);
            
            return deferred.promise;
        }
    }
];

exports.renderer = webParts.renderer({parts: parts});
