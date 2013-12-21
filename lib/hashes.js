exports.generateHash = generateHash;


var crypto = require("crypto");
var _ = require("underscore");


function generateHash(topValue) {
    var hash = crypto.createHash("sha1");
    
    function recurse(value) {
        if (_.isString(value)) {
            hash.update(value);
        } else if (_.isObject(value)) {
            var pairs = _.sortBy(_.pairs(value), function(value) {
                return value[0];
            });
            pairs.forEach(function(pair) {
                hash.update(pair[0]);
                recurse(pair[1]);
            });
        } else {
            throw new Error("Unhandled value");
        }
    }
    
    recurse(topValue);
    
    return hash.digest("hex");
}

