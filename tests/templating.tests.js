var q = require("q");
var jsdom = require("jsdom");
var _ = require("underscore");

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
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(fragment) {
            test.deepEqual('<div>Search: Your Song</div>', fragment.innerHTML);
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
        .then(parseHtmlElement)
        .then(function(fragment) {
            test.deepEqual('<div>widgets/menu: {}</div>', fragment.childNodes[0].innerHTML);
            test.deepEqual('<div>widgets/results: {"query":"Your Song"}</div>', fragment.childNodes[1].innerHTML);
            test.deepEqual(2, fragment.childNodes.length);
        });
});

exports["filled holes include name"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(fragment) {
            test.deepEqual('results', fragment.childNodes[1].getAttribute("data-hole-name"));
        });
});

exports["filled holes name defaults to part name"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(fragment) {
            test.deepEqual('widgets/menu', fragment.childNodes[0].getAttribute("data-hole-name"));
        });
});

exports["filled holes include hash"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
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
        .then(parseHtmlElement)
        .then(function(fragment) {
            var div = fragment.querySelector("div.container > div[data-hole-name='menu']");
            test.deepEqual('<div>widgets/menu: {}</div>', div.innerHTML);
    });
});

exports["update only modifies changed elements"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(root) {
            test.deepEqual(
                '0536826d998010287c65ef54d5da03ac50a23b83',
                root.childNodes[1].getAttribute("data-hole-hash")
            );
            return renderer.update("pages/search", {query: "Shining Light"}, root)
                .then(function() { return root; });
        })
        .then(function(root) {
            test.deepEqual(
                '57310bca57aad3f3c6c3476a9c8a46b49b8158a8',
                root.childNodes[1].getAttribute("data-hole-hash")
            );
        });
});

exports["update resets data-hole-hash"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(root) {
            root.childNodes[0].childNodes[0].isOriginal = true;
            root.childNodes[1].childNodes[0].isOriginal = true;
            return renderer.update("pages/search", {query: "Shining Light"}, root)
                .then(function() { return root; });
        })
        .then(function(root) {
            test.ok(root.childNodes[0].childNodes[0].isOriginal);
            test.ok(!root.childNodes[1].childNodes[0].isOriginal);
        });
});

exports["update resets data-hole-hash on compositions"] = asyncTest(function(test) {
    var originalHash;
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(root) {
            originalHash = root.getAttribute("data-hole-hash");
            return renderer.update("pages/search", {query: "Shining Light"}, root)
                .then(function() { return root; });
        })
        .then(function(root) {
            test.notEqual(originalHash, root.getAttribute("data-hole-hash"));
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

exports["grand child parts with same name as children are not affected by updates to children"] = asyncTest(function(test) {
    var renderer = webParts.renderer({
        parts: [
            {
                name: "one",
                render: function(name, context) {
                    return webParts.compose([
                        {name: "child-one", part: "one-one", context: {}},
                        {name: "main", part: "empty", context: context}
                    ]);
                }
            },
            {
                name: "one-one",
                render: function(name, context) {
                    return webParts.compose([
                        {name: "main", part: "empty", context: context}
                    ]);
                }
            },
            {name: "empty", render: function() { return "<div></div>"; }}
        ]
    });
    
    function findGrandChild(root) {
        return root.querySelector("*[data-hole-name='child-one'] > *[data-hole-name='main']");
    }
    
    function findChild(root) {
        return _.filter(root.childNodes, function(node) {
            return node.tagName === "DIV";
        })[1];
    }
    
    return renderer.render("one", {x: 1})
        .then(parseHtmlElement)
        .then(function(root) {
            findGrandChild(root).childNodes[0].isOriginal = true;
            findChild(root).childNodes[0].isOriginal = true;
            return renderer.update("one", {x: 2}, root)
                .then(function() { return root; });
        })
        .then(function(root) {
            test.ok(findGrandChild(root).childNodes[0].isOriginal);
            test.ok(!findChild(root).childNodes[0].isOriginal);
        });
});

exports["hole element is updated when grand child element of parent part"] = asyncTest(function(test) {
    var renderer = webParts.renderer({
        parts: [
            {
                name: "pages/search",
                render: function(name, context) {
                    return webParts.compose([
                        {name: "menu", part: "widgets/menu", context: context},
                    ]);
                },
                template: {fillHoles: function(holeContents) {
                    return '<div><div class="container">' + holeContents["menu"] + '</div></div>';
                }}
            },
            {name: "widgets/menu", render: htmlRenderer}
        ]
    });
    
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(root) {
            return renderer.update("pages/search", {query: "Shining Light"}, root)
                .then(function() { return root; });
        })
        .then(function(fragment) {
            var div = fragment.querySelector("div.container > div[data-hole-name='menu']");
            test.deepEqual('<div>widgets/menu: {"query":"Shining Light"}</div>', div.innerHTML);
    });
});

function parseHtmlFragment(html) {
    var deferred = q.defer();
    
    jsdom.env(html, function(errors, window) {
        deferred.resolve(window.document.getElementsByTagName("body")[0]);
    });
    
    return deferred.promise;
}

function parseHtmlElement(html) {
    return parseHtmlFragment(html)
        .then(function(fragment) {
            return fragment.childNodes[0];
        });
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

