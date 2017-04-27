"use strict";

describe("metalsmith-ancestry", function () {
    /**
     * If the passed in object is a value in the files object, then
     * return the matching key.
     *
     * @param {Object} files
     * @param {Object} value
     * @return {(string|null)}
     */
    function getMatchingFilename(files, value) {
        var i, keys;

        keys = Object.keys(files);

        for (i = 0; i < keys.length; i += 1) {
            if (files[keys[i]] === value) {
                return keys[i];
            }
        }

        return null;
    }


    /**
     * Removes circular references to file objects in a breadth-first manner.
     * When a reference to a file is found, it is replaced with a string
     * of "«filename»".
     *
     * @param {Object} files
     */
    function uncircular(files) {
        var item, list;

        /**
         * Process an item in the list. If the value is not an object,
         * skip. If the value is in the files array, replace. Otherwise
         * we add all properties back to the end of the list.
         *
         * Breadth first search.
         *
         * @param {string} key
         */
        function processItem(key) {
            var filename, value;

            value = item[key];

            if (!value || typeof value !== "object") {
                // Not an object. Skip.
                return;
            }

            filename = getMatchingFilename(files, value);

            if (filename) {
                item[key] = "«" + filename + "»";
            } else {
                list.push(value);
            }
        }

        // Populate the initial list of objects to cover.
        list = Object.keys(files).map(function (key) {
            return files[key];
        }).filter(function (value) {
            return value && typeof value === "object";
        });

        while (list.length) {
            item = list.shift();
            Object.keys(item).forEach(processItem);
        }
    }


    /**
     * Runs the plugin against a list of files.
     *
     * @param {Object} files
     * @param {Object} [options]
     */
    function runPlugin(files, options) {
        var plugin;

        plugin = require("..");
        plugin(options)(files, null, function () {});

        /* Due to the circular references, viewing this object is a royal
         * PAIN IN THE BUTT with hundreds of screenfuls of objects being
         * dumped. Instead of doing that, let's change all circular references
         * to other file object into that file object itself.
         */
        uncircular(files);
    }


    describe("option handling", function () {
        describe("with defaults", function () {
            var files;

            beforeEach(function () {
                files = {
                    "index.html": {},
                    "test/page.html": {},
                    "test/index.md": {},
                    "test/image.gif": {},
                    "test/thing.htm": {},
                    "test/folder/index.jade": {},
                    "test/folder2/big.html": {},
                    "test/folder2/index.htm": {}
                };
                runPlugin(files);
            });
            it("sets the ancestry property", function () {
                expect(files["index.html"].ancestry).toEqual(jasmine.any(Object));
                expect(files["test/index.md"].ancestry).toEqual(jasmine.any(Object));
                expect(files["test/image.gif"].ancestry).toEqual(jasmine.any(Object));
            });
            it("sets basename", function () {
                expect(files["index.html"].ancestry.basename).toEqual("index.html");
                expect(files["test/index.md"].ancestry.basename).toEqual("index.md");
            });
            it("sets children", function () {
                expect(files["index.html"].ancestry.children).toEqual([
                    "«test/index.md»"
                ]);
                expect(files["test/index.md"].ancestry.children).toEqual([
                    "«test/folder/index.jade»",
                    "«test/folder2/index.htm»"
                ]);
                expect(files["test/folder/index.jade"].ancestry.children).toBe(null);
                expect(files["test/folder2/index.htm"].ancestry.children).toBe(null);
            });
            it("sets firstChild", function () {
                expect(files["index.html"].ancestry.firstChild).toBe("«test/index.md»");
                expect(files["test/image.gif"].ancestry.firstChild).toBe("«test/folder/index.jade»");
                expect(files["test/folder/index.jade"].ancestry.firstChild).toBe(null);
            });
            it("sets firstMember", function () {
                expect(files["index.html"].ancestry.firstMember).toBe("«index.html»");
                expect(files["test/image.gif"].ancestry.firstMember).toBe("«test/index.md»");
            });
            it("sets firstSibling", function () {
                expect(files["test/folder2/big.html"].ancestry.firstSibling).toBe("«test/folder/index.jade»");
                expect(files["test/index.md"].ancestry.firstSibling).toBe("«test/index.md»");
            });
            it("sets lastChild", function () {
                expect(files["index.html"].ancestry.lastChild).toBe("«test/index.md»");
                expect(files["test/image.gif"].ancestry.lastChild).toBe("«test/folder2/index.htm»");
                expect(files["test/folder/index.jade"].ancestry.lastChild).toBe(null);
            });
            it("sets lastMember", function () {
                expect(files["index.html"].ancestry.lastMember).toBe("«index.html»");
                expect(files["test/image.gif"].ancestry.lastMember).toBe("«test/thing.htm»");
            });
            it("sets lastSibling", function () {
                expect(files["test/folder/index.jade"].ancestry.lastSibling).toBe("«test/folder2/index.htm»");
                expect(files["test/index.md"].ancestry.lastSibling).toBe("«test/index.md»");
            });
            it("sets members", function () {
                expect(files["index.html"].ancestry.members).toEqual([
                    "«index.html»"
                ]);
                expect(files["test/image.gif"].ancestry.members).toEqual([
                    "«test/index.md»",
                    "«test/image.gif»",
                    "«test/page.html»",
                    "«test/thing.htm»"
                ]);
            });
            it("sets nextMember", function () {
                expect(files["index.html"].ancestry.nextMember).toBe(null);
                expect(files["test/index.md"].ancestry.nextMember).toBe("«test/image.gif»");
                expect(files["test/image.gif"].ancestry.nextMember).toBe("«test/page.html»");
                expect(files["test/page.html"].ancestry.nextMember).toBe("«test/thing.htm»");
                expect(files["test/thing.htm"].ancestry.nextMember).toBe(null);
            });
            it("sets nextSibling", function () {
                expect(files["test/folder/index.jade"].ancestry.nextSibling).toBe("«test/folder2/index.htm»");
                expect(files["test/index.md"].ancestry.nextSibling).toBe(null);
            });
            it("sets parent", function () {
                expect(files["index.html"].ancestry.parent).toBe(null);
                expect(files["test/index.md"].ancestry.parent).toBe("«index.html»");
                expect(files["test/image.gif"].ancestry.parent).toBe("«index.html»");
            });
            it("sets path", function () {
                expect(files["index.html"].ancestry.path).toEqual("index.html");
                expect(files["test/index.md"].ancestry.path).toEqual("test/index.md");
            });
            it("sets prevMember", function () {
                expect(files["index.html"].ancestry.prevMember).toBe(null);
                expect(files["test/index.md"].ancestry.prevMember).toBe(null);
                expect(files["test/image.gif"].ancestry.prevMember).toBe("«test/index.md»");
                expect(files["test/page.html"].ancestry.prevMember).toBe("«test/image.gif»");
                expect(files["test/thing.htm"].ancestry.prevMember).toBe("«test/page.html»");
            });
            it("sets prevSibling", function () {
                expect(files["test/folder2/index.htm"].ancestry.prevSibling).toBe("«test/folder/index.jade»");
                expect(files["test/index.md"].ancestry.prevSibling).toBe(null);
            });
            it("sets root", function () {
                expect(files["index.html"].ancestry.root).toBe("«index.html»");
                expect(files["test/thing.htm"].ancestry.root).toBe("«index.html»");
                expect(files["test/folder2/index.htm"].ancestry.root).toBe("«index.html»");
            });
            it("sets self", function () {
                expect(files["index.html"].ancestry.self).toBe("«index.html»");
                expect(files["test/thing.htm"].ancestry.self).toBe("«test/thing.htm»");
            });
            it("sets siblings", function () {
                expect(files["test/image.gif"].ancestry.siblings).toEqual([
                    "«test/index.md»"
                ]);
                expect(files["test/folder/index.jade"].ancestry.siblings).toEqual([
                    "«test/folder/index.jade»",
                    "«test/folder2/index.htm»"
                ]);
            });
        });
        describe("changed ancestryProperty", function () {
            it("uses the altered setting", function () {
                var files;

                files = {
                    x: {}
                };
                runPlugin(files, {
                    ancestryProperty: "y"
                });
                expect(files).toEqual({
                    x: {
                        y: jasmine.any(Object)
                    }
                });
            });
        });
        describe("match options", function () {
            it("passes them to minimatch and they work", function () {
                var files;

                files = {
                    "index.html": {},
                    "index.md": {},
                    ".hidden/index.html": {}
                };
                runPlugin(files, {
                    match: "**/*.html",
                    matchOptions: {
                        dot: true
                    }
                });
                expect(files).toEqual({
                    "index.html": {
                        ancestry: jasmine.any(Object)
                    },
                    "index.md": {},
                    ".hidden/index.html": {
                        ancestry: jasmine.any(Object)
                    }
                });
            });
        });
        describe("reverse", function () {
            it("reverses the sort", function () {
                var files;

                files = {
                    a: {},
                    b: {}
                };
                runPlugin(files, {
                    reverse: true
                });
                expect(files.a.ancestry.members).toEqual([
                    "«b»",
                    "«a»"
                ]);
                expect(files.a.ancestry.firstMember).toEqual("«b»");
                expect(files.a.ancestry.lastMember).toEqual("«a»");
                expect(files.a.ancestry.nextMember).toEqual(null);
                expect(files.a.ancestry.prevMember).toEqual("«b»");
            });
        });
        describe("sortBy", function () {
            it("sorts using the supplied function", function () {
                var files;

                files = {
                    a: {
                        order: 1
                    },
                    b: {
                        order: 3
                    },
                    c: {
                        order: 2
                    }
                };
                runPlugin(files, {
                    sortBy: function (a, b) {
                        return a.order - b.order;
                    }
                });
                expect(files.a.ancestry.members).toEqual([
                    "«a»",
                    "«c»",
                    "«b»"
                ]);
            });
            it("sorts with a single property", function () {
                var files;

                files = {
                    a: {
                        order: 1
                    },
                    b: {
                        order: 3
                    },
                    c: {
                        order: 2
                    }
                };
                runPlugin(files, {
                    sortBy: "order"
                });
                expect(files.a.ancestry.members).toEqual([
                    "«a»",
                    "«c»",
                    "«b»"
                ]);
            });
            it("sorts with multiple properties", function () {
                var files;

                files = {
                    a: {
                        first: 1,
                        second: 3,
                        third: 1
                    },
                    b: {
                        first: 1,
                        second: 3,
                        third: 2
                    },
                    c: {
                        first: 1,
                        second: 2,
                        third: 1
                    }
                };
                runPlugin(files, {
                    sortBy: [
                        "first",
                        "second",
                        "third"
                    ]
                });
                expect(files.a.ancestry.members).toEqual([
                    "«c»",
                    "«a»",
                    "«b»"
                ]);
            });
        });
        describe("sortFilesFirst", function () {
            var files;

            /**
             * Returns the order of the files by using their name property.
             *
             * @return {string}
             */
            function fileOrder() {
                return files.a.ancestry.members.join(",");
            }

            beforeEach(function () {
                files = {
                    a: {
                        name: "a"
                    },
                    b: {
                        name: "b"
                    },
                    c: {
                        name: "c"
                    },
                    d: {
                        name: "d"
                    }
                };
            });
            it("does not sort with null", function () {
                // Really hard to test.  Mostly this is checking if the code
                // blows up.
                runPlugin(files, {
                    sortFilesFirst: null
                });
                expect(fileOrder()).toBe("«a»,«b»,«c»,«d»");
            });
            it("does not sort with an empty array", function () {
                // Really hard to test.  Mostly this is checking if the code
                // blows up.
                runPlugin(files, {
                    sortFilesFirst: []
                });
                expect(fileOrder()).toBe("«a»,«b»,«c»,«d»");
            });
            it("uses a single string", function () {
                runPlugin(files, {
                    sortFilesFirst: "b"
                });
                expect(fileOrder()).toBe("«b»,«a»,«c»,«d»");
            });
            it("uses a RegExp", function () {
                runPlugin(files, {
                    sortFilesFirst: /c/
                });
                expect(fileOrder()).toBe("«c»,«a»,«b»,«d»");
            });
            it("uses a function", function () {
                runPlugin(files, {
                    sortFilesFirst: function (a, b) {
                        if (a === "b") {
                            return -1;
                        }

                        if (b === "b") {
                            return 1;
                        }

                        return 0;
                    }
                });
                expect(fileOrder()).toBe("«b»,«a»,«c»,«d»");
            });
            it("uses an object with .test", function () {
                runPlugin(files, {
                    sortFilesFirst: {
                        test: function (x) {
                            return x === "c";
                        }
                    }
                });
                expect(fileOrder()).toBe("«c»,«a»,«b»,«d»");
            });
            it("uses an object with .match", function () {
                runPlugin(files, {
                    sortFilesFirst: {
                        match: function (x) {
                            return x === "c";
                        }
                    }
                });
                expect(fileOrder()).toBe("«c»,«a»,«b»,«d»");
            });
            it("uses an array of things", function () {
                runPlugin(files, {
                    sortFilesFirst: [
                        "b",
                        "d"
                    ]
                });
                expect(fileOrder()).toBe("«b»,«d»,«a»,«c»");
            });
            it("throws when it can't figure out how to sort", function () {
                expect(function () {
                    runPlugin(files, {
                        sortFilesFirst: 7
                    });
                }).toThrow();
            });
        });
    });
    describe("exported function:", function () {
        var plugin;

        beforeEach(function () {
            plugin = require("..");
        });
        describe("sortByProperty", function () {
            it("sorts objects as strings", function () {
                var list;

                list = [
                    {
                        thing: "Y"
                    },
                    {
                        thing: "z"
                    },
                    {
                        thing: "x"
                    }
                ];
                list.sort(plugin.sortByProperty("thing"));
                expect(list).toEqual([
                    {
                        thing: "x"
                    },
                    {
                        thing: "Y"
                    },
                    {
                        thing: "z"
                    }
                ]);
            });
            it("sorts objects with numbers", function () {
                var list;

                list = [
                    {
                        thing: -1
                    },
                    {
                        thing: 2
                    },
                    {
                        thing: 1
                    }
                ];
                list.sort(plugin.sortByProperty("thing"));
                expect(list).toEqual([
                    {
                        thing: -1
                    },
                    {
                        thing: 1
                    },
                    {
                        thing: 2
                    }
                ]);
            });
            it("sorts objects with mixed numbers", function () {
                var list;

                list = [
                    {
                        thing: "test"
                    },
                    {
                        thing: "09"
                    },
                    {
                        thing: 1
                    }
                ];
                list.sort(plugin.sortByProperty("thing"));

                // 1 is sorted as a string because it is always compared
                // to strings.
                expect(list).toEqual([
                    {
                        thing: "09"
                    },
                    {
                        thing: 1
                    },
                    {
                        thing: "test"
                    }
                ]);
            });
        });
        describe("sortCombine", function () {
            var combined;

            beforeEach(function () {
                combined = plugin.sortCombine([
                    function (a, b) {
                        if (a === "1") {
                            return -1;
                        }

                        if (b === "1") {
                            return 1;
                        }

                        return 0;
                    },
                    function (a, b) {
                        if (a === "2") {
                            return -2;
                        }

                        if (b === "2") {
                            return 2;
                        }

                        return 0;
                    }
                ]);
            });
            it("sorts by first sort method", function () {
                expect(combined("1", "x")).toEqual(-1);
                expect(combined("x", "1")).toEqual(1);
            });
            it("sorts by second sort method", function () {
                expect(combined("2", "x")).toEqual(-2);
                expect(combined("x", "2")).toEqual(2);
            });
            it("falls back to zeros when done", function () {
                expect(combined("x", "y")).toEqual(0);
            });
            it("does not combine when passed only one thing", function () {
                var fn;

                fn = function () {};
                combined = plugin.sortCombine([
                    fn
                ]);
                expect(combined).toBe(fn);
            });
        });
        describe("sortReverse", function () {
            it("reverses a negative result", function () {
                expect(plugin.sortReverse(function () {
                    return -2;
                })()).toEqual(2);
            });
            it("preserves zero and does not return negative zero", function () {
                expect(plugin.sortReverse(function () {
                    return 0;
                })()).toEqual(0);
            });
            it("reverses a positive result", function () {
                expect(plugin.sortReverse(function () {
                    return 2;
                })()).toEqual(-2);
            });
        });
        describe("sortStrings", function () {
            it("returns a negative value", function () {
                expect(plugin.sortStrings("mode", "monster")).toBeLessThan(0);
            });
            it("returns zero", function () {
                expect(plugin.sortStrings("mouse", "mouse")).toBe(0);
            });
            it("returns a positive value", function () {
                expect(plugin.sortStrings("moose", "monster")).toBeGreaterThan(0);
            });
            it("is case insensitive", function () {
                expect(plugin.sortStrings("A", "b")).toEqual(plugin.sortStrings("a", "B"));
            });
            it("handles null values", function () {
                expect(plugin.sortStrings(null, null)).toEqual(0);
                expect(plugin.sortStrings(null, "x")).toEqual(-1);
                expect(plugin.sortStrings("x", null)).toEqual(1);
            });
        });
    });
    describe("odd errors", function () {
        it("allows all files to be nested, where there should be a parent and is not", function () {
            var files;

            files = {
                "a/file/somewhere/not/at/the/root": {}
            };
            runPlugin(files);
            expect(files["a/file/somewhere/not/at/the/root"].ancestry.parent).toBe(null);
        });
    });
});
