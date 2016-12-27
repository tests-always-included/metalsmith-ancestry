"use strict";

describe("metalsmith-ancestry", function () {
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
                    files["test/index.md"]
                ]);
                expect(files["test/index.md"].ancestry.children).toEqual([
                    files["test/folder/index.jade"],
                    files["test/folder2/index.htm"]
                ]);
                expect(files["test/folder/index.jade"].ancestry.children).toBe(null);
                expect(files["test/folder2/index.htm"].ancestry.children).toBe(null);
            });
            it("sets first", function () {
                expect(files["index.html"].ancestry.first).toBe(files["index.html"]);
                expect(files["test/image.gif"].ancestry.first).toBe(files["test/index.md"]);
            });
            it("sets last", function () {
                expect(files["index.html"].ancestry.last).toBe(files["index.html"]);
                expect(files["test/image.gif"].ancestry.last).toBe(files["test/thing.htm"]);
            });
            it("sets next", function () {
                expect(files["index.html"].ancestry.next).toBe(null);
                expect(files["test/index.md"].ancestry.next).toBe(files["test/image.gif"]);
                expect(files["test/image.gif"].ancestry.next).toBe(files["test/page.html"]);
                expect(files["test/page.html"].ancestry.next).toBe(files["test/thing.htm"]);
                expect(files["test/thing.htm"].ancestry.next).toBe(null);
            });
            it("sets parent", function () {
                expect(files["index.html"].ancestry.parent).toBe(null);
                expect(files["test/index.md"].ancestry.parent).toBe(files["index.html"]);
                expect(files["test/image.gif"].ancestry.parent).toBe(files["index.html"]);
            });
            it("sets path", function () {
                expect(files["index.html"].ancestry.path).toEqual("index.html");
                expect(files["test/index.md"].ancestry.path).toEqual("test/index.md");
            });
            it("sets previous", function () {
                expect(files["index.html"].ancestry.previous).toBe(null);
                expect(files["test/index.md"].ancestry.previous).toBe(null);
                expect(files["test/image.gif"].ancestry.previous).toBe(files["test/index.md"]);
                expect(files["test/page.html"].ancestry.previous).toBe(files["test/image.gif"]);
                expect(files["test/thing.htm"].ancestry.previous).toBe(files["test/page.html"]);
            });
            it("sets self", function () {
                expect(files["index.html"].ancestry.self).toBe(files["index.html"]);
                expect(files["test/thing.htm"].ancestry.self).toBe(files["test/thing.htm"]);
            });
            it("sets siblings", function () {
                expect(files["index.html"].ancestry.siblings).toEqual([
                    files["index.html"]
                ]);
                expect(files["test/image.gif"].ancestry.siblings).toEqual([
                    files["test/index.md"],
                    files["test/image.gif"],
                    files["test/page.html"],
                    files["test/thing.htm"]
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
                expect(files.a.ancestry.siblings).toEqual([
                    files.b,
                    files.a
                ]);
                expect(files.a.ancestry.first).toEqual(files.b);
                expect(files.a.ancestry.last).toEqual(files.a);
                expect(files.a.ancestry.next).toEqual(null);
                expect(files.a.ancestry.previous).toEqual(files.b);
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
                expect(files.a.ancestry.siblings).toEqual([
                    files.a,
                    files.c,
                    files.b
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
                expect(files.a.ancestry.siblings).toEqual([
                    files.a,
                    files.c,
                    files.b
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
                expect(files.a.ancestry.siblings).toEqual([
                    files.c,
                    files.a,
                    files.b
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
                return files.a.ancestry.siblings.map(function (fileObject) {
                    return fileObject.name;
                }).join(",");
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
                expect(fileOrder()).toBe("a,b,c,d");
            });
            it("does not sort with an empty array", function () {
                // Really hard to test.  Mostly this is checking if the code
                // blows up.
                runPlugin(files, {
                    sortFilesFirst: []
                });
                expect(fileOrder()).toBe("a,b,c,d");
            });
            it("uses a single string", function () {
                runPlugin(files, {
                    sortFilesFirst: "b"
                });
                expect(fileOrder()).toBe("b,a,c,d");
            });
            it("uses a RegExp", function () {
                runPlugin(files, {
                    sortFilesFirst: /c/
                });
                expect(fileOrder()).toBe("c,a,b,d");
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
                expect(fileOrder()).toBe("b,a,c,d");
            });
            it("uses an object with .test", function () {
                runPlugin(files, {
                    sortFilesFirst: {
                        test: function (x) {
                            return x === "c";
                        }
                    }
                });
                expect(fileOrder()).toBe("c,a,b,d");
            });
            it("uses an object with .match", function () {
                runPlugin(files, {
                    sortFilesFirst: {
                        match: function (x) {
                            return x === "c";
                        }
                    }
                });
                expect(fileOrder()).toBe("c,a,b,d");
            });
            it("uses an array of things", function () {
                runPlugin(files, {
                    sortFilesFirst: [
                        "b",
                        "d"
                    ]
                });
                expect(fileOrder()).toBe("b,d,a,c");
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
            it("sorts objects", function () {
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
