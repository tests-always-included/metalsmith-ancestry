metalsmith-ancestry
===================

*EXPERIMENTAL!*  There are no tests yet!  The results of this may change in the future!

Builds a family tree from your file and folder locations.  Lets you reference the next, previous, parent and all children of a particular resource.

Currently open for any feedback in ways to make this more useful for others.

[![npm version][npm-badge]][npm-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]
[![codecov.io][codecov-badge]][codecov-link]


What It Does
------------

**Not written yet.  This is experimental software.**

Try it out and look at the `ancestry` property in your file metadata.


Installation
------------

`npm` can do this for you.

    npm install --save metalsmith-ancestry


Usage
-----

Include this like you would include any other plugin.

    // Load this, just like other plugins.
    var dataLoader = require("metalsmith-ancestry");

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
        matchOptions: {}

        // READ THE SOURCE TO FIGURE OUT MORE OPTIONS
    })

This uses [minimatch] to match files.  The `.matchOptions` object can be filled with options that the [minimatch] library uses.

**NEED TO EXPLAIN LAYOUT OF ANCESTRY OBJECT**

**NEED EXAMPLES OF HOW TO USE THIS IN MUSTACHE**


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
[metalsmith-models]: https://github.com/jaichandra/metalsmith-models
[minimatch]: https://github.com/isaacs/minimatch
[Mustache]: https://mustache.github.io/
[npm-badge]: https://badge.fury.io/js/metalsmith-ancestry.svg
[npm-link]: https://npmjs.org/package/metalsmith-ancestry
[travis-badge]: https://secure.travis-ci.org/tests-always-included/metalsmith-ancestry.png
[travis-link]: http://travis-ci.org/tests-always-included/metalsmith-ancestry
