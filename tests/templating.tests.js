var q = require("q");
var jsdom = require("jsdom");

var webParts = require("../");


var htmlRenderer = function(name, context) {
    return '<div>' + name + ': ' + JSON.stringify(context) + '</div>';
};


exports["error if no renderer exists for part"] = asyncTest(function(test) {
    var renderer = webParts.renderer({});
    return renderer.render("pages/search", {query: "Your Song"}).then(function(output) {
        test.fail("expected failure");
    }, function(error) {
        test.deepEqual("Unknown part: pages/search", error.message);
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

var renderer = webParts.renderer({
    parts: [
        {
            name: "pages/search",
            render: function(name, context) {
                return webParts.compose([
                    {part: "widgets/menu", context: {}},
                    {name: "results", part: "widgets/results", context: context}
                ]);
            }
        },
        {name: "widgets/menu", render: htmlRenderer},
        {name: "widgets/results", render: htmlRenderer}
    ]
});

exports["parts are composed by concatenation if no template is specified"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtml)
        .then(function(fragment) {
            test.deepEqual('<div>widgets/menu: {}</div>', fragment.childNodes[0].innerHTML);
            test.deepEqual('<div>widgets/results: {"query":"Your Song"}</div>', fragment.childNodes[1].innerHTML);
            test.deepEqual(2, fragment.childNodes.length);
        });
});

exports["filled holes include name"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtml)
        .then(function(fragment) {
            test.deepEqual('results', fragment.childNodes[1].getAttribute("data-hole-name"));
        });
});

exports["filled holes name defaults to part name"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtml)
        .then(function(fragment) {
            test.deepEqual('widgets/menu', fragment.childNodes[0].getAttribute("data-hole-name"));
        });
});

exports["filled holes include hash"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtml)
        .then(function(fragment) {
            test.deepEqual('0536826d998010287c65ef54d5da03ac50a23b83', fragment.childNodes[1].getAttribute("data-hole-hash"));
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
                    ]);
                },
                template: {fillHoles: function(holeContents) {
                    return '<div class="container">' + holeContents["menu"] + '</div>';
                }}
            },
            {name: "widgets/menu", render: htmlRenderer}
        ]
    });
    
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtml)
        .then(function(fragment) {
            var div = fragment.querySelector("div.container > div[data-hole-name='menu']");
            test.deepEqual('<div>widgets/menu: {}</div>', div.innerHTML);
    });
});

exports["commentsTemplate reads <!-- HOLE: blah --> as hole in template"] = function(test) {
    var template = webParts.commentsTemplate("one<!-- HOLE: blah -->two");
    test.deepEqual(
        "one-filled-two",
        template.fillHoles({blah: "-filled-"})
    );
    test.done();
};

function parseHtml(html) {
    var deferred = q.defer();
    
    jsdom.env(html, function(errors, window) {
        deferred.resolve(window.document.getElementsByTagName("body")[0]);
    });
    
    return deferred.promise;
}

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

