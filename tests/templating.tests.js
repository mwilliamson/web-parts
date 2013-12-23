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


exports["string is treated as literal when returned from render"] = asyncTest(function(test) {
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

exports["parts are composed by concatenation if no template is specified"] = asyncTest(function(test) {
    var renderer = webParts.renderer({
        parts: [
            {
                name: "pages/search",
                render: function(name, context) {
                    return webParts.compose([
                        {part: "widgets/menu", context: {}},
                        {part: "widgets/results", context: context}
                    ]);
                }
            },
            {name: "widgets/menu", render: htmlRenderer},
            {name: "widgets/results", render: htmlRenderer}
        ]
    });
    
    return renderer.render("pages/search", {query: "Your Song"}).then(function(output) {
        test.deepEqual(
            '<div data-hole-name="widgets/menu" data-hole-hash="45d9013a691cdd8536a7039b0425198e8b1c9bf9"><div>widgets/menu: {}</div></div>' +
            '<div data-hole-name="widgets/results" data-hole-hash="83707dfd7c3d9eda7915d9063b030fe329d9a3b2"><div>widgets/results: {"query":"Your Song"}</div></div>',
            output
        );
    });
});

exports["template is used for composed parts if set"] = asyncTest(function(test) {
    var renderer = webParts.renderer({
        parts: [
            {
                name: "pages/search",
                render: function(name, context) {
                    return webParts.compose([
                        {name: "menu", part: "widgets/menu", context: {}},
                        {name: "results", part: "widgets/results", context: context}
                    ]);
                },
                template: '<div class="container"><!-- HOLE: menu --><!-- HOLE: results --></div>'
            },
            {name: "widgets/menu", render: htmlRenderer},
            {name: "widgets/results", render: htmlRenderer}
        ]
    });
    
    return renderer.render("pages/search", {query: "Your Song"}).then(function(output) {
        test.deepEqual(
            '<div class="container">' +
            '<div data-hole-name="menu" data-hole-hash="8dac430e472bdd8c4cdd9150cb0dc5f839ec7812"><div>widgets/menu: {}</div></div>' +
            '<div data-hole-name="results" data-hole-hash="0536826d998010287c65ef54d5da03ac50a23b83"><div>widgets/results: {"query":"Your Song"}</div></div>' +
            '</div>',
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

