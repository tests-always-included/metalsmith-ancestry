/**
 * Metalsmith Ancestry - Generate a hierarchical listing of files based on
 * where they are in the file tree. Add useful navigation metadata to files
 * in your Metalsmith build.
 *
 * @example
 * var ancestry = require("metalsmith-ancestry");
 *
 * // Create your Metalsmith instance and add this like other middleware.
 * metalsmith.use(ancestry({
 *     // Options go here.
 * });
 *
 * @module metalsmith-ancestry
 */
"use strict";

/**
 * This is a typical file object from Metalsmith.
 *
 * @typedef {Object} metalsmithFile
 * @property {Buffer} contents
 * @property {string} mode
 */

/**
 * Options for this plugin.
 *
 * @typedef {Object} ancestryOptions
 * @property {string} [ancestryProperty=ancestry] The metadata property name to assign
 * @property {module:metalsmith-plugin-kit~matchList} [match] Files to match. Defaults to all files.
 * @property {module:metalsmith-plugin-kit~matchOptions} [matchOptions={}] Options controlling globbing behavior.
 * @property {boolean} [reverse=false]
 * @property {module:metalsmith-ancestry~ancestrySortBy} [sortBy] How to sort siblings.
 * @property {module:metalsmith-plugin-kit~matchList} [sortFilesFirst] What files should come first in the sibling list. Defaults to index files with `htm`, `html`, `jade`, or `md` extensions.
 * @property {module:metalsmith-plugin-kit~matchOptions} sortFilesFirstOptions Options controlling the globbing behavior of `sortFilesFirst`.
 * @see {@link https://github.com/fidian/metalsmith-plugin-kit}
 */


/**
 * This represents the type of object that is added as metadata to each
 * of the file objects.
 *
 * @typedef {Object} ancestry
 * @property {string} basename file.ext
 * @property {module:metalsmith-ancestry~metalsmithFile[]} [children] First member in subfolders.
 * @property {module:metalsmith-ancestry~metalsmithFile} firstChild
 * @property {module:metalsmith-ancestry~metalsmithFile} firstMember
 * @property {module:metalsmith-ancestry~metalsmithFile} firstSibling
 * @property {module:metalsmith-ancestry~metalsmithFile} lastChild
 * @property {module:metalsmith-ancestry~metalsmithFile} lastMember
 * @property {module:metalsmith-ancestry~metalsmithFile} lastSibling
 * @property {number} memberIndex
 * @property {module:metalsmith-ancestry~metalsmithFile[]} members Files in same directory.
 * @property {module:metalsmith-ancestry~metalsmithFile} [nextChild]
 * @property {module:metalsmith-ancestry~metalsmithFile} [nextMember]
 * @property {module:metalsmith-ancestry~metalsmithFile} [nextSibling]
 * @property {module:metalsmith-ancestry~metalsmithFile} [parent]
 * @property {string} path folder/file.ext
 * @property {module:metalsmith-ancestry~metalsmithFile} [prevChild]
 * @property {module:metalsmith-ancestry~metalsmithFile} [prevMember]
 * @property {module:metalsmith-ancestry~metalsmithFile} [prevSibling]
 * @property {module:metalsmith-ancestry~metalsmithFile} root The top-most parent's parent's parent's parent.
 * @property {module:metalsmith-ancestry~metalsmithFile} self
 * @property {number} siblingIndex
 * @property {module:metalsmith-ancestry~metalsmithFile[]} siblings First member in adjacent directories.
 */


/**
 * @typedef {(Function|string|Array.<string>|null)} ancestrySortBy
 */


var path, pluginKit;

path = require("path");
pluginKit = require("metalsmith-plugin-kit");


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
 * Return a function that will sort file objects by a property. This will
 * sort numbers appropriately as long as both values are numbers. Otherwise,
 * this falls back to a string-based sort.
 *
 * @param {string} propName
 * @return {Function}
 */
function sortByProperty(propName) {
    return function (a, b) {
        var aValue, bValue;

        aValue = a[propName];
        bValue = b[propName];

        if (typeof aValue === "number" && typeof bValue === "number") {
            return aValue - bValue;
        }

        return sortStrings(aValue, bValue);
    };
}


/**
 * Files that match should be sorted first.
 *
 * @param {module:metalsmith-plugin-kit~matchList} filesFirst
 * @param {module:metalsmith-plugin-kit~matchOptions} filesFirstOptions
 * @param {string} ancestryProperty
 * @return {Function}
 */
function sortByMatchingFilename(filesFirst, filesFirstOptions, ancestryProperty) {
    var matchFn;

    matchFn = pluginKit.filenameMatcher(filesFirst, filesFirstOptions);

    return function (a, b) {
        var aMatch, bMatch;

        aMatch = matchFn(a[ancestryProperty].path);
        bMatch = matchFn(b[ancestryProperty].path);

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
 * @param {module:metalsmith-ancestry~ancestrySortBy} sortBy
 * @param {boolean} reverse
 * @param {module:metalsmith-plugin-kit~matchList} filesFirst
 * @param {module:metalsmith-plugin-kit~matchOptions} filesFirstOptions
 * @param {string} ancestryProperty
 * @return {Function}
 */
function buildSortFunction(sortBy, reverse, filesFirst, filesFirstOptions, ancestryProperty) {
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
    if (filesFirst) {
        sortFnList.unshift(sortByMatchingFilename(filesFirst, filesFirstOptions, ancestryProperty));
    }

    // Make a single function
    sortFn = sortCombine(sortFnList);

    if (reverse) {
        sortFn = sortReverse(sortFn);
    }

    return sortFn;
}


/**
 * Sort all members so they are in the right order before we
 * determine the nextMember and prevMember links.
 *
 * @param {Object.<string,Array>} filesByFolder Ancestories grouped by their folder.
 * @param {Function} sortFn How children get sorted.
 */
function sortMembers(filesByFolder, sortFn) {
    var i, keys;

    // Avoiding .forEach for speed
    keys = Object.keys(filesByFolder);

    for (i = 0; i < keys.length; i += 1) {
        filesByFolder[keys[i]].sort(sortFn);
    }
}


/**
 * Link to the parent if one exists.
 *
 * @param {Object.<string,Array>} filesByFolder Ancestories grouped by their folder.
 * @param {ancestry} ancestry
 */
function assignParent(filesByFolder, ancestry) {
    var folder, parentFolder;

    ancestry.parent = null;
    folder = path.posix.resolve("/", ancestry.path, "..").slice(1);

    if (folder !== "") {
        parentFolder = path.posix.resolve("/", folder, "..").slice(1);

        if (filesByFolder[parentFolder]) {
            ancestry.parent = filesByFolder[parentFolder][0];
        }
    }
}


/**
 * Follow parent links up until there are no more, then link directly
 * to the root.
 *
 * @param {module:metalsmith-ancestry~options} options
 * @param {ancestry} ancestry
 */
function assignRoot(options, ancestry) {
    var root;

    root = ancestry.self;

    while (root && root[options.ancestryProperty].parent) {
        root = root[options.ancestryProperty].parent;
    }

    ancestry.root = root;
}


/**
 * Assigns the next, prev, first, last links for a given type.
 *
 * @param {ancestry} ancestry
 * @param {string} suffix
 * @param {files[]} list
 */
function assignRelativeLinks(ancestry, suffix, list) {
    var i;

    ancestry[`next${suffix}`] = null;
    ancestry[`prev${suffix}`] = null;
    ancestry[`first${suffix}`] = list[0];
    ancestry[`last${suffix}`] = list[list.length - 1];

    // Find the next and prev
    for (i = 0; i < list.length; i += 1) {
        if (list[i] === ancestry.self) {
            if (list[i - 1]) {
                ancestry[`prev${suffix}`] = list[i - 1];
            }

            if (list[i + 1]) {
                ancestry[`next${suffix}`] = list[i + 1];
            }

            // Short circuit
            return;
        }
    }
}


/**
 * Assign the member related links
 *
 * @param {ancestry} ancestry
 */
function assignMemberLinks(ancestry) {
    assignRelativeLinks(ancestry, "Member", ancestry.members);
}


/**
 * Makes the list of children for each file object. The work
 * is only done on the first member and copied to all subsequent
 * members.
 *
 * @param {Object.<string,Array>} filesByFolder Ancestories grouped by their folder.
 * @param {Function} sortFn How children get sorted.
 * @param {module:metalsmith-ancestry~options} options
 * @param {ancestry} ancestry
 */
function assignChildren(filesByFolder, sortFn, options, ancestry) {
    var children, folder, i, keys;

    if (ancestry.firstMember !== ancestry.self) {
        return;
    }

    // Create an array of children that point to the first member
    // of each lineage.
    children = [];
    folder = path.posix.resolve("/", ancestry.path, "..").slice(1);
    keys = Object.keys(filesByFolder);

    for (i = 0; i < keys.length; i += 1) {
        const folderPath = keys[i];

        // This filters out where folder = "" and folderPath = "",
        // and the "parent folder" of folderPath would still be "".
        if (folderPath !== folder) {
            const theirParent = path.posix.resolve("/", folderPath, "..").slice(1);

            if (theirParent === folder) {
                children.push(filesByFolder[folderPath][0]);
            }
        }
    }

    if (children.length) {
        children.sort(sortFn);
    } else {
        children = null;
    }

    for (i = 0; i < ancestry.members.length; i += 1) {
        const member = ancestry.members[i];

        member[options.ancestryProperty].children = children;

        if (children) {
            member[options.ancestryProperty].firstChild = children[0];
            member[options.ancestryProperty].lastChild = children[children.length - 1];
        } else {
            member[options.ancestryProperty].firstChild = null;
            member[options.ancestryProperty].lastChild = null;
        }
    }
}


/**
 * Siblings is simply a copy of the parent's children.
 *
 * @param {module:metalsmith-ancestry~options} options
 * @param {ancestry} ancestry
 */
function assignSiblings(options, ancestry) {
    if (ancestry.parent) {
        ancestry.siblings = ancestry.parent[options.ancestryProperty].children;
        assignRelativeLinks(ancestry, "Sibling", ancestry.siblings);
    } else {
        ancestry.siblings = [
            ancestry.self
        ];
        ancestry.firstSibling = ancestry.self;
        ancestry.lastSibling = ancestry.self;
        ancestry.nextSibling = null;
        ancestry.prevSibling = null;
    }
}


/**
 * Assign siblingIndex and memberIndex
 *
 * @param {ancestry} ancestry
 */
function assignIndexes(ancestry) {
    ancestry.memberIndex = ancestry.members.indexOf(ancestry.self);
    ancestry.siblingIndex = ancestry.siblings.indexOf(ancestry.firstMember);
}


/**
 * Factory to build middleware for Metalsmith.
 *
 * @param {module:metalsmith-ancestry~options} options
 * @return {Function}
 */
module.exports = function (options) {
    var ancestories, filesByFolder, sortFn;

    options = pluginKit.defaultOptions({
        ancestryProperty: "ancestry",
        match: "**/*",
        matchOptions: {},
        reverse: false,
        sortBy: null,
        sortFilesFirst: "**/index.{htm,html,jade,md}",
        sortFilesFirstOptions: {}
    }, options);

    sortFn = buildSortFunction(options.sortBy, options.reverse, options.sortFilesFirst, options.sortFilesFirstOptions, options.ancestryProperty);

    return pluginKit.middleware({
        after() {
            var i;

            sortMembers(filesByFolder, sortFn);

            // Now update all of the children, nextMember, prevMember and
            // parent links. Uses `for` loops for speed.
            for (i = 0; i < ancestories.length; i += 1) {
                assignParent(filesByFolder, ancestories[i]);
            }

            for (i = 0; i < ancestories.length; i += 1) {
                assignRoot(options, ancestories[i]);
            }

            for (i = 0; i < ancestories.length; i += 1) {
                assignMemberLinks(ancestories[i]);
            }

            for (i = 0; i < ancestories.length; i += 1) {
                assignChildren(filesByFolder, sortFn, options, ancestories[i]);
            }

            for (i = 0; i < ancestories.length; i += 1) {
                assignSiblings(options, ancestories[i]);
            }

            for (i = 0; i < ancestories.length; i += 1) {
                assignIndexes(ancestories[i]);
            }
        },
        before() {
            ancestories = [];
            filesByFolder = {};
        },
        each(filename, file) {
            var ancestry, folder;

            folder = path.posix.resolve("/", filename, "..").slice(1);

            if (!filesByFolder[folder]) {
                filesByFolder[folder] = [];
            }

            filesByFolder[folder].push(file);

            // Create initial ancestry objects for each file object.  Can't
            // fill in all of the information quite yet because finding all
            // children must happen after we find all files that should get
            // an ancestry.
            ancestry = {
                basename: path.basename(filename),
                path: filename,
                self: file,
                members: filesByFolder[folder]
            };
            file[options.ancestryProperty] = ancestry;
            ancestories.push(ancestry);
        },
        match: options.match,
        matchOptions: options.matchOptions,
        name: "metalsmith-ancestry"
    });
};

module.exports.sortByProperty = sortByProperty;
module.exports.sortCombine = sortCombine;
module.exports.sortReverse = sortReverse;
module.exports.sortStrings = sortStrings;
