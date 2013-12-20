var webParts = require("../");


var htmlRenderer = function(name, context) {
    return '<div>' + name + ': ' + JSON.stringify(context) + '</div>';
};


exports["result is null if no renderer exists for part"] = asyncTest(function(test) {
    var renderer = webParts.renderer({});
    return renderer.render("pages/search", {query: "Your Song"}).then(function(output) {
        test.deepEqual(null, output);
    });
});


exports["templated part is rendered using templater"] = asyncTest(function(test) {
    var renderer = webParts.renderer({
        parts: [
            {
                name: "pages/search",
                render: function (name, context) {
                    return '<div>Search: ' + context.query + '</div>';
                }
            }
        ]
    });
    return renderer.render("pages/search", {query: "Your Song"}).then(function(output) {
        test.deepEqual('<div>Search: Your Song</div>', output);
    });
});

exports["composed part is rendered using composition of templated parts"] = asyncTest(function(test) {
    var renderer = webParts.renderer({
        parts: [
            {
                name: "pages/search",
                render: function(name, context) {
                    return webParts.compose([
                        {name: "widgets/menu", context: {}},
                        {name: "widgets/results", context: context}
                    ]);
                }
            },
            {name: "widgets/menu", render: htmlRenderer},
            {name: "widgets/results", render: htmlRenderer}
        ]
    });
    
    return renderer.render("pages/search", {query: "Your Song"}).then(function(output) {
        test.deepEqual(
            '<div data-part-hash="c3b7a10af0705511e4fce36110467114ad7f5c2f"><div>widgets/menu: {}</div></div>' +
            '<div data-part-hash="da9fead2b9fe4702d58905371895b616660d7f31"><div>widgets/results: {"query":"Your Song"}</div></div>',
            output
        );
    });
});

function asyncTest(func) {
    return function(test) {
        func(test).then(function() {
            test.done();
        }, function(error) {
            test.ifError(error);
            test.done();
        });
    };
}

