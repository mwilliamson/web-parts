var webParts = require("../");


exports["commentsTemplate reads <!-- HOLE: blah --> as hole in template"] = function(test) {
    var template = webParts.templating.commentsTemplate("one<!-- HOLE: blah -->two");
    test.deepEqual(
        "one-filled-two",
        template.fillHoles({blah: "-filled-"})
    );
    test.done();
};
