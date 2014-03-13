var bluebird = require("bluebird");


exports.defer = bluebird.defer;
exports.when = bluebird.resolve;
exports.all = bluebird.all;
exports.reject = bluebird.reject;
