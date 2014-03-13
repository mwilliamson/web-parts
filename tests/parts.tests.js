var jsdom = require("jsdom");
var _ = require("underscore");

var webParts = require("../");
var promises = require("../lib/promises");


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
    ],
    generateHash: function(value) {
        return JSON.stringify(value);
    }
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
            var hash = fragment.childNodes[1].getAttribute("data-hole-hash");
            test.deepEqual({
                name: "results",
                part:"widgets/results",
                context: {"query":"Your Song"}
            }, JSON.parse(hash));
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

exports["update resets data-hole-hash"] = asyncTest(function(test) {
    return renderer.render("pages/search", {query: "Your Song"})
        .then(parseHtmlElement)
        .then(function(root) {
            test.deepEqual(
                {name: "results", part: "widgets/results", context: {query: "Your Song"}},
                JSON.parse(root.childNodes[1].getAttribute("data-hole-hash"))
            );
            return renderer.update("pages/search", {query: "Shining Light"}, root)
                .then(function() { return root; });
        })
        .then(function(root) {
            test.deepEqual(
                {name: "results", part: "widgets/results", context: {query: "Shining Light"}},
                JSON.parse(root.childNodes[1].getAttribute("data-hole-hash"))
            );
        });
});

exports["update only modifies changed elements"] = asyncTest(function(test) {
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

exports["earlier updates are ignored if they finish after later updates"] = asyncTest(function(test) {
    var second = promises.defer();
    var third = promises.defer();
    
    var partPromises = {1: "one", 2: second.promise, 3: third.promise};
    
    var renderer = webParts.renderer({
        parts: [
            {
                name: "main",
                render: function(name, context) {
                    return partPromises[context.promise];
                }
            }
        ]
    });
    
    var secondUpdate;
    
    return renderer.render("main", {promise: 1})
        .then(parseHtmlElement)
        .then(function(root) {
            secondUpdate = renderer.update("main", {promise: 2}, root);
            var thirdUpdate = renderer.update("main", {promise: 3}, root);
            third.resolve("third");
            return thirdUpdate.then(function() { return root; });
        })
        .then(function(root) {
            second.resolve("second");
            return secondUpdate.then(function() { return root; });
        })
        .then(function(root) {
            test.equal("third", root.textContent);
        });
});

exports["beforeUpdate and afterUpdate events are emitted on update"] = asyncTest(function(test) {
    var deferred = promises.defer();
    var renderer = webParts.renderer({
        parts: [
            {
                name: "main",
                render: function(name, context) {
                    if (context.x) {
                        return deferred.promise;
                    } else {
                        return "";
                    }
                }
            }
        ]
    });
    
    var beforeUpdate = [];
    renderer.on("beforeUpdate", function(event) {
        beforeUpdate.push(event);
    });
    var afterUpdate = [];
    var afterUpdateDeferred = promises.defer();
    renderer.on("afterUpdate", function(event) {
        afterUpdate.push(event);
        afterUpdateDeferred.resolve();
    });
    
    return renderer.render("main", {})
        .then(parseHtmlElement)
        .then(function(root) {
            renderer.update("main", {x: 1}, root);
            
            test.equal(1, beforeUpdate.length);
            test.ok(root === beforeUpdate[0].element);
            test.equal(0, afterUpdate.length);
            
            deferred.resolve("");
            
            return afterUpdateDeferred.promise.then(function() { return root; });
        })
        .then(function(root) {
            test.equal(1, beforeUpdate.length);
            test.equal(1, afterUpdate.length);
            test.ok(root === afterUpdate[0].element);
        });
});

exports["afterUpdateSelf is emitted after composed part has updated itself but not its children"] = asyncTest(function(test) {
    var deferred = promises.defer();
    var renderer = webParts.renderer({
        parts: [
            {
                name: "container",
                render: function(name, context) {
                    return webParts.compose([
                        {part: "main", context: context}
                    ]);
                }
            },
            {
                name: "main",
                render: function(name, context) {
                    if (context.x) {
                        var deferred = promises.defer();
                        return deferred.promise;
                    } else {
                        return "";
                    }
                }
            }
        ]
    });
    
    var afterUpdateSelf = [];
    var afterUpdateSelfDeferred = promises.defer();
    renderer.on("afterUpdateSelf", function(event) {
        afterUpdateSelf.push(event);
        afterUpdateSelfDeferred.resolve();
    });
    
    return renderer.render("container", {})
        .then(parseHtmlElement)
        .then(function(root) {
            renderer.update("container", {x: 1}, root);
            return afterUpdateSelfDeferred.promise;
        }).then(function() {
            test.equal(1, afterUpdateSelf.length);
        })
});

function parseHtmlFragment(html) {
    var deferred = promises.defer();
    
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

