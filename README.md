metalsmith-ancestry
===================

Builds a family tree from your file and folder locations.  Lets you reference the next, previous, parent and all children of a particular resource.  Very handy when used in conjunction with [metalsmith-relative-links] and [mustache-hbt-md], which lets you construct markdown with links to other pages, such as subpage listings or automatic navigation through pages.

[![npm version][npm-badge]][npm-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]
[![codecov.io][codecov-badge]][codecov-link]


What It Does
------------

All of the file objects are assigned an `.ancestry` property, which is an object that contains the following properties:

    fileObject.ancestry = {
        basename: "index.html",  // The base filename of the source file.
        children: [ ... ],       // First member of sibling groups.
        first: { ... },          // Same as .siblings[0].
        last: { ... },           // Same as .siblings[siblings.length - 1].
        next: { ... },           // Next sibling file object.
        parent: { ... },         // Parent of this file object.
        path: "test/index.html", // Full name of the source file.
        previous: { ... },       // Previous sibling file object.
        self: { ... },           // The file object that has this ancestry.
        siblings: [ ... ]        // All members of this family.
    }

Using this object, you can navigate to other file objects that would be supplied to any Metalsmith plugin.  When you use [metalsmith-relative-links] and supply its link function a file object, it can return the URI necessary to link two resources together.

All files in a directory tree are placed together.  Here's a sample directory listing.

    index.html
    about/index.html
    contact/index.html
    contact/email.html
    contact/in-person.html

If you were to inspect the `.ancestry` object that relates to `contact/email.html`, it would look something like this:

    {
        basename: "email.html",
        children: null,
        first: { ... contact/index.html ... },
        last: { ... contact/in-person.html ... },
        next: { ... contact/in-person.html ... },
        parent: { ... index.html ... },
        path: "contact/email.html",
        previous: { ... contact/index.html ... },
        self: { ... contact/index.html ... },
        siblings: [
            { ... contact/index.html ...},
            { ... contact/email.html ...},
            { ... contact/in-person.html ...}
        ]
    }

Anywhere I cited `{ ... some-file ... }`, that is a link to the file object.  So, if you were processing a file and you had access to its metadata, then `.ancestry.self` would be pointing back at itself.  It's a circular link, so be very careful when you start dumping these objects to any logging system.

The real power shows up when you leverage these family links inside of your content.  Combining [metalsmith-hbt-md] and [metalsmith-relative-links], you can make a subpage listing.  This example uses files that have `title` and `summary` in their file's frontmatter.

    {{#ancestry.children}}
    * [{{title}}]({{link.from ancestry.parent}}) - {{summary}}
    {{/ancestry.children}}

If this was generated for the `index.html` within the above file tree, you would see this in the rendered markdown:

    * [About Us](about/) - All about the creators of this site.
    * [Contact Information](contact/) - The various ways you can reach us.

You could also use this for instruction pages or in a gallery.  If doing that, I would recommend [metalsmith-mustache-metadata]; this example requires that plugin to work.

    {{#ancestry.previous?}}
    [Previous](ancestry.link.to ancestry.previous)
    {{/ancestry.previous?}}
    {{#ancestry.next?}}
    [Next](ancestry.link.to ancestry.next)
    {{/ancestry.next?}}


Installation
------------

`npm` can do this for you.

    npm install --save metalsmith-ancestry


Usage
-----

Include this like you would include any other plugin.

    // Load this, just like other plugins.
    var ancestry = require("metalsmith-ancestry");

    // Then in your list of plugins you use it.
    .use(ancestry())

    // Alternately, you can specify options.  The values shown here are
    // the defaults.
    .use(ancestry({
        // Property name that gets the ancestry data object.
        ancestryProperty: "ancestry",

        // Pattern of files to match in case you want to limit processing
        // to specific files.
        match: "**/*",

        // Options for matching files.  See minimatch for more information.
        matchOptions: {},

        // Reverse the sorting of siblings.
        reverse: false,

        // How to sort siblings.  See later documentation.
        sortBy: null,

        // Files that should be placed first, regardless.  Explained below.
        sortFilesFirst: "**/index.{htm,html,jade,md}"
    })

This uses [minimatch] to match files.  The `.matchOptions` object can be filled with options that the [minimatch] library uses.


### Sorting Siblings

This is the most complex portion of the code.  It is also the reason that sorting functions are exported with the plugin; those are covered later.

First, let's discuss the `sortBy` option.  It is allowed to accept any of the following:

* `null` - Don't worry about sorting and let the plugin do it for you automatically.  The plugin sorts based on `ancestry.path`, case-insensitively.
* `"propertyName"` - All single strings are treated as property names and are sorted case-insensitively.
* `["propName1", "propName2"]` - Sort by multiple property names.  If the first property is identical in both file objects then it falls back to a second and third sort (as many as you define in the array).
* `function (a, b) {...}` - Use the defined function for sorting file objects.  You can compose one from functions you build and the sorting functions that the Ancestry module provides.

Because index files are typically the entry point and should be first, the `sortFilesFirst` property in the options allows you to configure this.  It also allows several types of inputs.

* `null` - This tells the plugin to sort with typical index files first.  It matches `index.htm`, `index.html`, `index.jade` and `index.md`.
* `"**/index.html"` - Strings match against the file using `minimatch`.  So you can specify exact filenames or patterns with wildcards.
* `/(^|\/|\\)index\.([^.]*)/` - Regular expression objects are allowed.  This one would match any file starting with `index.` with any extension but only one extension.
* `function (path) { ... }` - Define your own function for the utmost in control.
* `{ test: function (path) { ... }}` - If you have an object with a `.test()` function, this can use it.  This would work for regular expression objects and similar libraries.
* `{ match: function (path) { ... }}` - When supplied an object with a `.match()` function, this can use it.  Minimatch and similar libraries export objects like this.
* `[ matcher1, matcher2 ]` - An array whose values are any of the above would also work.  In this way you can easily match multiple globs or a complex series of behavior with several functions.

In addition, you can easily reverse the sort by setting `reverse: true` in the options.


### Sorting Functions

On the `ancestory` function are some sorting properties.

**`sortFunction = ancestry.sortByProperty(name)`**

Returns a function to sort file objects by a specific property name.  The sorting uses `ancestry.sortStrings()` internally, so it is case insensitive.

    files = [
        {
            contents: Buffer.from("Fake file contents"),
            title: "Spring"
        },
        {
            contents: Buffer.from("Fake file contents"),
            title: "Summer"
        },
        {
            contents: Buffer.from("Fake file contents"),
            title: "Fall"
        },
        {
            contents: Buffer.from("Fake file contents"),
            title: "Winter"
        }
    ];
    files.sort(ancestry.sortByProperty("title"));
    // Result order:
    //   Fall, Spring, Summer, Winter

**`sortFunction = ancestry.sortCombine(functionListArray)`**

`Array.prototype.sort` only allows a single sorting function.  `.sortCombine()` lets you take multiple sort functions and it will merge them together into a single function.  If the first function returns a tie, the next one is used and so forth.

    arr.sort(ancestry.sortCombine([
        firstSortFunction,
        secondSortFunction
    ]));

**`sortFunction = ancestry.sortReverse(originalSortFunction)`**

Reverses any sort.

    arr = [ "test1", "Table", "ta" ];
    arr.sort(ancestry.sortReverse(ancestry.sortStrings));
    console.log(arr);  // [ "test1", "Table", "ta" ];

**`sortResult = ancestry.sortStrings(a, b)`**

Returns the value from sorting two strings, case-insensitively.

    arr = [ "test1", "Table", "ta" ];
    arr.sort(ancestry.sortStrings);
    console.log(arr);  // [ "ta", "Table", "test1" ];


Development
-----------

This uses Jasmine, Istanbul and ESLint for tests.

    # Install all of the dependencies
    npm install

    # Run the tests
    npm run test

This plugin is licensed under the [MIT License][License] with an additional non-advertising clause.  See the [full license text][License] for information.


[codecov-badge]: https://codecov.io/github/tests-always-included/metalsmith-ancestry/coverage.svg?branch=master
[codecov-link]: https://codecov.io/github/tests-always-included/metalsmith-ancestry?branch=master
[dependencies-badge]: https://david-dm.org/tests-always-included/metalsmith-ancestry.png
[dependencies-link]: https://david-dm.org/tests-always-included/metalsmith-ancestry
[devdependencies-badge]: https://david-dm.org/tests-always-included/metalsmith-ancestry/dev-status.png
[devdependencies-link]: https://david-dm.org/tests-always-included/metalsmith-ancestry#info=devDependencies
[License]: LICENSE.md
[metalsmith-hbt-md]: https://github.com/ahdiaz/metalsmith-hbt-md
[metalsmith-relative-links]: https://github.com/tests-always-included/metalsmith-relative-links
[metalsmith-models]: https://github.com/jaichandra/metalsmith-models
[metalsmith-mustache-metadata]: https://github.com/tests-always-included/metalsmith-mustache-metadata
[minimatch]: https://github.com/isaacs/minimatch
[Mustache]: https://mustache.github.io/
[npm-badge]: https://badge.fury.io/js/metalsmith-ancestry.svg
[npm-link]: https://npmjs.org/package/metalsmith-ancestry
[travis-badge]: https://secure.travis-ci.org/tests-always-included/metalsmith-ancestry.png
[travis-link]: http://travis-ci.org/tests-always-included/metalsmith-ancestry
