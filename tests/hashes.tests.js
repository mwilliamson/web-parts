var hashes = require("../lib/hashes");

exports["different numbers generate different hashes"] =
    assertDifferentHash(1, 2);

exports["number and string of that number generate different hashes"] =
    assertDifferentHash(1, "1");

function assertDifferentHash(first, second) {
    return function(test) {
        test.notEqual(hashes.generateHash(first), hashes.generateHash(second));
        test.done();
    };
}
