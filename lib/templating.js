exports.commentsTemplate = commentsTemplate;


function commentsTemplate(sourceString) {
    return {
        fillHoles: function(holeMap) {
            var holeRegex = /<!--\s*HOLE:\s*(\S+)\s*-->/g;
            return sourceString.replace(holeRegex, function(match, holeName) {
                return holeMap[holeName];
            });
        }
    };
}
