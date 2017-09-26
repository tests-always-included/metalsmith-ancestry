"use strict";

describe("metalsmith-ancestry", () => {
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
                item[key] = `«${filename}»`;
            } else {
                list.push(value);
            }
        }

        // Populate the initial list of objects to cover.
        list = Object.keys(files).map((key) => {
            return files[key];
        }).filter((value) => {
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
     * @return {Promise.<Object>} files, uncircularized
     */
    function runPlugin(files, options) {
        var plugin;

        plugin = require("..");

        return new Promise((resolve, reject) => {
            plugin(options)(files, null, (err) => {
                if (err) {
                    reject(err);
                } else {
                    /* Due to the circular references, viewing this object is a
                     * royal PAIN IN THE BUTT with hundreds of screenfuls of
                     * objects being dumped. Instead of doing that, let's
                     * change all circular references to other file object into
                     * that file object itself.
                     */
                    uncircular(files);
                    resolve(files);
                }
            });
        });
    }


    describe("option handling", () => {
        describe("with defaults", () => {
            var files;

            beforeEach(() => {
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

                return runPlugin(files);
            });
            it("sets the ancestry property", () => {
                expect(files["index.html"].ancestry).toEqual(jasmine.any(Object));
                expect(files["test/index.md"].ancestry).toEqual(jasmine.any(Object));
                expect(files["test/image.gif"].ancestry).toEqual(jasmine.any(Object));
            });
            it("sets basename", () => {
                expect(files["index.html"].ancestry.basename).toEqual("index.html");
                expect(files["test/index.md"].ancestry.basename).toEqual("index.md");
            });
            it("sets children", () => {
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
            it("sets firstChild", () => {
                expect(files["index.html"].ancestry.firstChild).toBe("«test/index.md»");
                expect(files["test/image.gif"].ancestry.firstChild).toBe("«test/folder/index.jade»");
                expect(files["test/folder/index.jade"].ancestry.firstChild).toBe(null);
            });
            it("sets firstMember", () => {
                expect(files["index.html"].ancestry.firstMember).toBe("«index.html»");
                expect(files["test/image.gif"].ancestry.firstMember).toBe("«test/index.md»");
            });
            it("sets firstSibling", () => {
                expect(files["test/folder2/big.html"].ancestry.firstSibling).toBe("«test/folder/index.jade»");
                expect(files["test/index.md"].ancestry.firstSibling).toBe("«test/index.md»");
            });
            it("sets lastChild", () => {
                expect(files["index.html"].ancestry.lastChild).toBe("«test/index.md»");
                expect(files["test/image.gif"].ancestry.lastChild).toBe("«test/folder2/index.htm»");
                expect(files["test/folder/index.jade"].ancestry.lastChild).toBe(null);
            });
            it("sets lastMember", () => {
                expect(files["index.html"].ancestry.lastMember).toBe("«index.html»");
                expect(files["test/image.gif"].ancestry.lastMember).toBe("«test/thing.htm»");
            });
            it("sets lastSibling", () => {
                expect(files["test/folder/index.jade"].ancestry.lastSibling).toBe("«test/folder2/index.htm»");
                expect(files["test/index.md"].ancestry.lastSibling).toBe("«test/index.md»");
            });
            it("sets memberIndex", () => {
                expect(files["index.html"].ancestry.memberIndex).toBe(0);
                expect(files["test/image.gif"].ancestry.memberIndex).toBe(1);
            });
            it("sets members", () => {
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
            it("sets nextMember", () => {
                expect(files["index.html"].ancestry.nextMember).toBe(null);
                expect(files["test/index.md"].ancestry.nextMember).toBe("«test/image.gif»");
                expect(files["test/image.gif"].ancestry.nextMember).toBe("«test/page.html»");
                expect(files["test/page.html"].ancestry.nextMember).toBe("«test/thing.htm»");
                expect(files["test/thing.htm"].ancestry.nextMember).toBe(null);
            });
            it("sets nextSibling", () => {
                expect(files["test/folder/index.jade"].ancestry.nextSibling).toBe("«test/folder2/index.htm»");
                expect(files["test/index.md"].ancestry.nextSibling).toBe(null);
            });
            it("sets parent", () => {
                expect(files["index.html"].ancestry.parent).toBe(null);
                expect(files["test/index.md"].ancestry.parent).toBe("«index.html»");
                expect(files["test/image.gif"].ancestry.parent).toBe("«index.html»");
            });
            it("sets path", () => {
                expect(files["index.html"].ancestry.path).toEqual("index.html");
                expect(files["test/index.md"].ancestry.path).toEqual("test/index.md");
            });
            it("sets prevMember", () => {
                expect(files["index.html"].ancestry.prevMember).toBe(null);
                expect(files["test/index.md"].ancestry.prevMember).toBe(null);
                expect(files["test/image.gif"].ancestry.prevMember).toBe("«test/index.md»");
                expect(files["test/page.html"].ancestry.prevMember).toBe("«test/image.gif»");
                expect(files["test/thing.htm"].ancestry.prevMember).toBe("«test/page.html»");
            });
            it("sets prevSibling", () => {
                expect(files["test/folder2/index.htm"].ancestry.prevSibling).toBe("«test/folder/index.jade»");
                expect(files["test/index.md"].ancestry.prevSibling).toBe(null);
            });
            it("sets root", () => {
                expect(files["index.html"].ancestry.root).toBe("«index.html»");
                expect(files["test/thing.htm"].ancestry.root).toBe("«index.html»");
                expect(files["test/folder2/index.htm"].ancestry.root).toBe("«index.html»");
            });
            it("sets self", () => {
                expect(files["index.html"].ancestry.self).toBe("«index.html»");
                expect(files["test/thing.htm"].ancestry.self).toBe("«test/thing.htm»");
            });
            it("sets siblingIndex", () => {
                expect(files["index.html"].ancestry.siblingIndex).toBe(0);
                expect(files["test/folder/index.jade"].ancestry.siblingIndex).toBe(0);
                expect(files["test/folder2/big.html"].ancestry.siblingIndex).toBe(1);
            });
            it("sets siblings", () => {
                expect(files["test/image.gif"].ancestry.siblings).toEqual([
                    "«test/index.md»"
                ]);
                expect(files["test/folder/index.jade"].ancestry.siblings).toEqual([
                    "«test/folder/index.jade»",
                    "«test/folder2/index.htm»"
                ]);
            });
        });
        describe("changed ancestryProperty", () => {
            it("uses the altered setting", () => {
                runPlugin({
                    x: {}
                }, {
                    ancestryProperty: "y"
                }).then((files) => {
                    expect(files).toEqual({
                        x: {
                            y: jasmine.any(Object)
                        }
                    });
                });
            });
        });
        describe("match options", () => {
            it("passes them to minimatch and they work", () => {
                return runPlugin({
                    "index.html": {},
                    "index.md": {},
                    ".hidden/index.html": {}
                }, {
                    match: "**/*.html",
                    matchOptions: {
                        dot: true
                    }
                }).then((files) => {
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
        });
        describe("reverse", () => {
            it("reverses the sort", () => {
                return runPlugin({
                    a: {},
                    b: {}
                }, {
                    reverse: true
                }).then((files) => {
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
        });
        describe("sortBy", () => {
            it("sorts using the supplied function", () => {
                return runPlugin({
                    a: {
                        order: 1
                    },
                    b: {
                        order: 3
                    },
                    c: {
                        order: 2
                    }
                }, {
                    sortBy(a, b) {
                        return a.order - b.order;
                    }
                }).then((files) => {
                    expect(files.a.ancestry.members).toEqual([
                        "«a»",
                        "«c»",
                        "«b»"
                    ]);
                });
            });
            it("sorts with a single property", () => {
                return runPlugin({
                    a: {
                        order: 1
                    },
                    b: {
                        order: 3
                    },
                    c: {
                        order: 2
                    }
                }, {
                    sortBy: "order"
                }).then((files) => {
                    expect(files.a.ancestry.members).toEqual([
                        "«a»",
                        "«c»",
                        "«b»"
                    ]);
                });
            });
            it("sorts with multiple properties", () => {
                return runPlugin({
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
                }, {
                    sortBy: [
                        "first",
                        "second",
                        "third"
                    ]
                }).then((files) => {
                    expect(files.a.ancestry.members).toEqual([
                        "«c»",
                        "«a»",
                        "«b»"
                    ]);
                });
            });
        });
        describe("sortFilesFirst", () => {
            var files;

            /**
             * Returns the order of the files by using their name property.
             *
             * @return {string}
             */
            function fileOrder() {
                return files.a.ancestry.members.join(",");
            }

            beforeEach(() => {
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
            it("does not sort with null", () => {
                // Really hard to test.  Mostly this is checking if the code
                // blows up.
                return runPlugin(files, {
                    sortFilesFirst: null
                }).then(() => {
                    expect(fileOrder()).toBe("«a»,«b»,«c»,«d»");
                });
            });
            it("does not sort with an empty array", () => {
                // Really hard to test.  Mostly this is checking if the code
                // blows up.
                return runPlugin(files, {
                    sortFilesFirst: []
                }).then(() => {
                    expect(fileOrder()).toBe("«a»,«b»,«c»,«d»");
                });
            });
            it("uses a single string", () => {
                return runPlugin(files, {
                    sortFilesFirst: "b"
                }).then(() => {
                    expect(fileOrder()).toBe("«b»,«a»,«c»,«d»");
                });
            });
            it("uses a RegExp", () => {
                return runPlugin(files, {
                    sortFilesFirst: /c/
                }).then(() => {
                    expect(fileOrder()).toBe("«c»,«a»,«b»,«d»");
                });
            });
            it("uses a function", () => {
                return runPlugin(files, {
                    sortFilesFirst(a, b) {
                        if (a === "b") {
                            return -1;
                        }

                        if (b === "b") {
                            return 1;
                        }

                        return 0;
                    }
                }).then(() => {
                    expect(fileOrder()).toBe("«b»,«a»,«c»,«d»");
                });
            });
            it("uses an object with .test", () => {
                return runPlugin(files, {
                    sortFilesFirst: {
                        test(x) {
                            return x === "c";
                        }
                    }
                }).then(() => {
                    expect(fileOrder()).toBe("«c»,«a»,«b»,«d»");
                });
            });
            it("uses an array of things", () => {
                return runPlugin(files, {
                    sortFilesFirst: [
                        "b",
                        "d"
                    ]
                }).then(() => {
                    expect(fileOrder()).toBe("«b»,«d»,«a»,«c»");
                });
            });
            it("fails when it can't figure out how to sort", () => {
                runPlugin(files, {
                    sortFilesFirst: 7
                }).then(jasmine.fail, () => {});
            });
        });
    });
    describe("exported function:", () => {
        var plugin;

        beforeEach(() => {
            plugin = require("..");
        });
        describe("sortByProperty", () => {
            it("sorts objects as strings", () => {
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
            it("sorts objects with numbers", () => {
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
            it("sorts objects with mixed numbers", () => {
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
        describe("sortCombine", () => {
            var combined;

            beforeEach(() => {
                combined = plugin.sortCombine([
                    (a, b) => {
                        if (a === "1") {
                            return -1;
                        }

                        if (b === "1") {
                            return 1;
                        }

                        return 0;
                    },
                    (a, b) => {
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
            it("sorts by first sort method", () => {
                expect(combined("1", "x")).toEqual(-1);
                expect(combined("x", "1")).toEqual(1);
            });
            it("sorts by second sort method", () => {
                expect(combined("2", "x")).toEqual(-2);
                expect(combined("x", "2")).toEqual(2);
            });
            it("falls back to zeros when done", () => {
                expect(combined("x", "y")).toEqual(0);
            });
            it("does not combine when passed only one thing", () => {
                var fn;

                fn = () => {};
                combined = plugin.sortCombine([
                    fn
                ]);
                expect(combined).toBe(fn);
            });
        });
        describe("sortReverse", () => {
            it("reverses a negative result", () => {
                expect(plugin.sortReverse(() => {
                    return -2;
                })()).toEqual(2);
            });
            it("preserves zero and does not return negative zero", () => {
                expect(plugin.sortReverse(() => {
                    return 0;
                })()).toEqual(0);
            });
            it("reverses a positive result", () => {
                expect(plugin.sortReverse(() => {
                    return 2;
                })()).toEqual(-2);
            });
        });
        describe("sortStrings", () => {
            it("returns a negative value", () => {
                expect(plugin.sortStrings("mode", "monster")).toBeLessThan(0);
            });
            it("returns zero", () => {
                expect(plugin.sortStrings("mouse", "mouse")).toBe(0);
            });
            it("returns a positive value", () => {
                expect(plugin.sortStrings("moose", "monster")).toBeGreaterThan(0);
            });
            it("is case insensitive", () => {
                expect(plugin.sortStrings("A", "b")).toEqual(plugin.sortStrings("a", "B"));
            });
            it("handles null values", () => {
                expect(plugin.sortStrings(null, null)).toEqual(0);
                expect(plugin.sortStrings(null, "x")).toEqual(-1);
                expect(plugin.sortStrings("x", null)).toEqual(1);
            });
        });
    });
    describe("odd errors", () => {
        it("allows all files to be nested, where there should be a parent and is not", () => {
            return runPlugin({
                "a/file/somewhere/not/at/the/root": {}
            }).then((files) => {
                expect(files["a/file/somewhere/not/at/the/root"].ancestry.parent).toBe(null);
            });
        });
    });
});
