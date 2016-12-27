"use strict";

/**
 * This is a typical file object from Metalsmith.
 *
 * @typedef {Object} fileObject
 * @property {Buffer} contents
 */

/**
 * Options for this plugin.
 *
 * @typedef {Object} ancestryOptions
 * @property {string} ancestryProperty
 * @property {string} match
 * @property {string} matchOptions
 * @property {boolean} reverse
 * @property {ancestrySortby} sortBy
 * @property {ancestryMatchers} sortFilesFirst
 */


/**
 * This represents the type of object that is added as metadata to each
 * of the file objects.
 *
 * @typedef {Object} ancestry
 * @property {string} basename
 * @property {fileObject} [children]
 * @property {fileObject} first
 * @property {fileObject} last
 * @property {fileObject} [next]
 * @property {fileObject} [parent]
 * @property {string} path
 * @property {fileObject} [previous]
 * @property {fileObject} self
 * @property {Array.<fileObject>} siblings Complete list, including self
 */


/**
 * @typedef {(Function|string|Array.<string>|null)} ancestrySortBy
 */


/**
 * @typedef {Object} ancestryMatchObject
 * @property {Function} [match] Either one of these can be defined.
 * @property {Function} [test] Either one of these can be defined.
 */


/**
 * @typedef {(string|RegExp|Function|ancestryMatchObject)} ancestryMatch
 */


/**
 * @typedef {(ancestryMatch|Array.<ancestryMatch>)} ancestryMatchers
 */


var minimatch, path;

minimatch = require("minimatch");
path = require("path");


/**
 * Return a function that chains together multiple sort functions.
 *
 * @param {Array.<Function>} sorts
 * @return {Function}
 */
function sortCombine(sorts) {
    if (sorts.length === 1) {
        return sorts[0];
    }

    return function (a, b) {
        var i, result;

        i = 0;

        while (!result && i < sorts.length) {
            result = sorts[i](a, b);
            i += 1;
        }

        return result;
    };
}


/**
 * Returns the right value from sorting two strings.  Strings are sorted
 * case-insensitively.
 *
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
function sortStrings(a, b) {
    if (!a && !b) {
        return 0;
    }

    if (!a) {
        return -1;
    }

    if (!b) {
        return 1;
    }

    a = a.toString().toLowerCase();
    b = b.toString().toLowerCase();

    if (a < b) {
        return -1;
    }

    if (a > b) {
        return 1;
    }

    return 0;
}


/**
 * Reverses a sort function.
 *
 * @param {Function} sortFunction
 * @return {Function}
 */
function sortReverse(sortFunction) {
    return function (a, b) {
        var result;

        result = sortFunction(a, b);

        if (result) {
            result *= -1;
        }

        return result;
    };
}


/**
 * Return a function that will sort file objects by a property.
 *
 * @param {string} propName
 * @return {Function}
 */
function sortByProperty(propName) {
    return function (a, b) {
        return sortStrings(a[propName], b[propName]);
    };
}


/**
 * Files that match should be sorted first.
 *
 * @param {ancestryMatchers} matchers
 * @param {string} ancestryProperty
 * @return {Function}
 */
function sortByMatchingFilename(matchers, ancestryProperty) {
    var matchFnList;

    /**
     * Take the input and see if any of the functions in the list
     * match the input.  Returns true if any of the functions return
     * a truthy value.
     *
     * @param {string} filePath
     * @return {boolean}
     */
    function matchAny(filePath) {
        var i;

        for (i = 0; i < matchFnList.length; i += 1) {
            if (matchFnList[i](filePath)) {
                return true;
            }
        }

        return false;
    }


    // Convert matches to be an array of matching functions
    matchFnList = [].concat(matchers).map(function (val) {
        var minimatchInstance;

        // Path expressions
        if (typeof val === "string") {
            minimatchInstance = new minimatch.Minimatch(val, {});

            return function (input) {
                return minimatchInstance.match(input);
            };
        }

        // This handles functions
        if (typeof val === "function") {
            return val;
        }

        // This works for RegExp objects and similar constructs
        if (val.test && typeof val.test === "function") {
            return function (input) {
                return val.test(input);
            };
        }

        // Minimatch and other libraries
        if (val.match && typeof val.match === "function") {
            return function (input) {
                return val.match(input);
            };
        }

        throw new Error("Can't handle matcher: " + val.toString());
    });

    return function (a, b) {
        var aMatch, bMatch;

        aMatch = matchAny(a[ancestryProperty].path);
        bMatch = matchAny(b[ancestryProperty].path);

        if (aMatch === bMatch) {
            return 0;
        }

        if (aMatch) {
            return -1;
        }

        return 1;
    };
}


/**
 * Create the sorting function using the options that were supplied.
 *
 * @param {ancestrySortBy} sortBy
 * @param {boolean} reverse
 * @param {ancestryMatchers} filesFirst
 * @param {string} ancestryProperty
 * @return {Function}
 */
function buildSortFunction(sortBy, reverse, filesFirst, ancestryProperty) {
    var sortFn, sortFnList;

    if (typeof sortBy === "function") {
        sortFnList = [
            sortBy
        ];
    } else if (sortBy) {
        sortFnList = [].concat(sortBy).map(sortByProperty);
    } else {
        // Default to sorting by ancestry.path
        sortFnList = [
            function (a, b) {
                return sortStrings(a[ancestryProperty].path, b[ancestryProperty].path);
            }
        ];
    }

    // If we need to sort some files first, put that sort function first.
    if (filesFirst.length) {
        sortFnList.unshift(sortByMatchingFilename(filesFirst, ancestryProperty));
    }

    // Make a single function
    sortFn = sortCombine(sortFnList);

    if (reverse) {
        sortFn = sortReverse(sortFn);
    }

    return sortFn;
}


/**
 * Factory to build middleware for Metalsmith.
 *
 * @param {Object} options
 * @return {Function}
 */
module.exports = function (options) {
    var matcher, sortFn;

    options = options || {};
    options.ancestryProperty = options.ancestryProperty || "ancestry";
    options.match = options.match || "**/*";
    options.matchOptions = options.matchOptions || {};
    options.reverse = options.reverse || false;
    options.sortBy = options.sortBy || null;
    options.sortFilesFirst = options.sortFilesFirst || "**/index.{htm,html,jade,md}";
    options.sortFilesFirst = [].concat(options.sortFilesFirst);
    matcher = new minimatch.Minimatch(options.match, options.matchOptions);

    sortFn = buildSortFunction(options.sortBy, options.reverse, options.sortFilesFirst, options.ancestryProperty);


    /**
     * Middleware function.
     *
     * @param {Object} files
     * @param {Object} metalsmith
     * @param {Function} done
     */
    return function (files, metalsmith, done) {
        var ancestories, byFolder;


        /**
         * This effectively builds the tree.  It assigns the children,
         * next, previous, and parent links.
         *
         * @param {ancestry} ancestry
         */
        function assignRelationships(ancestry) {
            var children, folder, i, parentFolder;

            // Initialize
            ancestry.children = null;
            ancestry.next = null;
            ancestry.parent = null;
            ancestry.previous = null;

            // Find the parent
            folder = path.posix.resolve("/", ancestry.path, "..").slice(1);

            if (folder !== "") {
                parentFolder = path.posix.resolve("/", folder, "..").slice(1);

                if (byFolder[parentFolder]) {
                    ancestry.parent = byFolder[parentFolder][0];
                }
            }

            // Assign first and last
            ancestry.first = ancestry.siblings[0];
            ancestry.last = ancestry.siblings[ancestry.siblings.length - 1];

            // Find next and previous
            for (i = 0; i < ancestry.siblings.length; i += 1) {
                if (ancestry.siblings[i] === ancestry.self) {
                    if (i > 0) {
                        ancestry.previous = ancestry.siblings[i - 1];
                    }

                    if (i + 1 < ancestry.siblings.length) {
                        ancestry.next = ancestry.siblings[i + 1];
                    }

                    i = ancestry.siblings.length;
                }
            }

            // Create an array of children that point to the first sibling
            // of each lineage.
            children = [];

            Object.keys(byFolder).forEach(function (folderPath) {
                var theirParent;

                // This filters out where folder = "" and folderPath = "",
                // and the "parent folder" of folderPath would still be "".
                if (folderPath !== folder) {
                    theirParent = path.posix.resolve("/", folderPath, "..").slice(1);

                    if (theirParent === folder) {
                        children.push(byFolder[folderPath][0]);
                    }
                }
            });

            if (children.length) {
                children.sort(sortFn);
                ancestry.children = children;
            }
        }


        /**
         * Finds the siblings array for a given filename.
         *
         * @param {string} filename
         * @param {fileObject} file
         * @return {Array.<ancestry>}
         */
        function findSiblings(filename, file) {
            var folder;

            folder = path.posix.resolve("/", filename, "..").slice(1);

            if (!byFolder[folder]) {
                byFolder[folder] = [];
            }

            byFolder[folder].push(file);

            return byFolder[folder];
        }


        /**
         * Sort all siblings so they are in the right order before we
         * determine the next and previous links.
         */
        function processSiblings() {
            Object.keys(byFolder).forEach(function (folder) {
                byFolder[folder].sort(sortFn);
            });
        }


        ancestories = [];
        byFolder = {};

        // Create initial ancestry objects for each file object.  Can't
        // fill in all of the information quite yet because finding all
        // children must happen after we find all files that should get
        // an ancestry.
        Object.keys(files).forEach(function (filename) {
            var ancestry;

            if (matcher.match(filename)) {
                // Just a rudimentary object is assigned here.  Links
                // to other file objects come later.
                ancestry = {
                    basename: path.basename(filename),
                    path: filename,
                    self: files[filename],
                    siblings: findSiblings(filename, files[filename])
                };
                files[filename][options.ancestryProperty] = ancestry;
                ancestories.push(ancestry);
            }
        });

        processSiblings();

        // Now update all of the children, next, previous and parent links.
        ancestories.forEach(assignRelationships);
        done();
    };
};

module.exports.sortByProperty = sortByProperty;
module.exports.sortCombine = sortCombine;
module.exports.sortReverse = sortReverse;
module.exports.sortStrings = sortStrings;
