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
        // These refer to just the file object itself
        basename: "index.html",  // The base filename of the source file.
        path: "test/index.html", // Full name of the source file.
        self: { ... },           // The file object that has this ancestry.

        // Up in the hierarchy.
        parent: { ... },         // Parent of this file object. **

        // Navigating member files of this folder.
        members: [ ... ],        // All file objects in the same folder.
        firstMember: { ... },    // The first member (same as .members[0]).
        lastMember: { ... },     // The last member.
        nextMember: { ... },     // The next member in the list.
        prevMember: { ... },     // The previous member in the list.

        // Jumping to other folders at the same level.
        siblings: [ ... ],       // One file object per folder. **
        firstSibling: { ... },   // The first sibling (same as .siblings[0]).
        lastSibling: { ... },    // The last sibling.
        nextSibling: { ... },    // The next sibling in the list.
        prevSibling: { ... },    // The previous sibling in the list.

        // Descending in the directory tree.
        children: [ ... ],       // First member of each descendent. **
        firstChild: { ... },     // The first child (same as .children[0]).
        lastChild: { ... }       // The last child.
    }

`**` - These items are arrays that contain single file objects that "stand for" the entire folder. The file that is there is the first one sorted, so it would always appear as `.members[0]`. This is because one can not link to a folder because there are no folders in Metalsmith - only files.

Using this `ancestry` object, you can navigate to other file objects that would be supplied to any Metalsmith plugin.  When you use [metalsmith-relative-links] and supply its link function a file object, it can return the URI necessary to link two resources together.

All files in a directory tree are placed together.  Here's a sample directory listing.

    index.html
    site.css
    about/index.html
    contact/index.html
    contact/email.html
    contact/in-person.html
    contact/live-chat/index.html
    contact/live-chat/chat.jar
    contact/live-chat/chat.swf
    contact/location/index.html

If you were to inspect the `.ancestry` object that relates to `contact/email.html`, it would look something like the following. Please note that the example uses the shorthand `«filename»` to indicate we're linking to that specific file object.

    {
        basename: "email.html",
        path: "contact/email.html",
        self: «contact/email.html»,

        // Up in the hierarchy.
        parent: «index.html»,
        root: «index.html»,

        // Navigating member files of this folder.
        members: [
            «contact/index.html»
            «contact/email.html»
            «contact/in-person.html»
        ],
        firstMember: «contact/index.html»,
        lastMember: «contact/in-person.html»,
        nextMember: «contact/in-person.html»,
        prevMember: «contact/index.html»,

        // Jumping to other folders at the same level.
        siblings: [
            «about/index.html»,
            «contact/index.html»
        ],
        firstSibling: «about/index.html»,
        lastSibling: «contact/index.html»,
        nextSibling: null,
        prevSibling: «about/index.html»,

        // Descending in the directory tree.
        children: [
            «contact/live-chat/index.html»,
            «contact/location/index.html»
        },
        firstChild: «contact/live-chat/index.html»,
        lastChild: «contact/location/index.html»
    }

A word of caution: if you were processing a file and you had access to its metadata, then `.ancestry.self` would be pointing back at itself.  It's a circular link, so be very careful when you start dumping these objects to any logging system.

The real power shows up when you leverage these family links inside of your content.  Combining [metalsmith-hbt-md] and [metalsmith-relative-links], you can make a subpage listing.  This example uses files that have `title` and `summary` in their file's frontmatter.

    {{#ancestry.children}}
    * [{{title}}]({{link.from ancestry.parent}}) - {{summary}}
    {{/ancestry.children}}

If this was generated for the `index.html` within the above file tree, you would see this in the rendered markdown:

    * [About Us](about/) - All about the creators of this site.
    * [Contact Information](contact/) - The various ways you can reach us.

You could also use this for instruction pages or in a gallery.  If doing that, I would recommend [metalsmith-mustache-metadata]; this example requires that plugin to work.

This is what you'd use if you jump from page to page in the same folder.

    {{#ancestry.previousMember?}}
    [Previous](ancestry.link.to ancestry.previousMember)
    {{/ancestry.previousMember?}}

    {{#ancestry.nextMember?}}
    [Next](ancestry.link.to ancestry.nextMember)
    {{/ancestry.nextMember?}}

If you keep your pages separated into different folders, the syntax is almost identical.

    {{#ancestry.previousSibling?}}
    [Previous](ancestry.link.to ancestry.previousSibling)
    {{/ancestry.previousSibling?}}

    {{#ancestry.nextSibling?}}
    [Next](ancestry.link.to ancestry.nextSibling)
    {{/ancestry.nextSibling?}}


Installation
------------

`npm` can do this for you.

    npm install --save metalsmith-ancestry


Usage
-----

Include this like you would include any other plugin.  Here's a CLI example that also shows the default options.  You don't need to specify any of these unless you want to change its value.

    {
        "plugins": {
            "metalsmith-ancestry": {
                "ancestryProperty": "ancestry",
                "match": "**/*",
                "matchOptions": {},
                "reverse": false,
                "sortBy": null,
                "sortFilesFirst": "**/index.{htm,html,jade,md}"
            }
        }
    }

And this is how you use it in JavaScript, with a small description of each option.

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

        // Options for matching files.  See metalsmith-plugin-kit for
        // more information.
        matchOptions: {},

        // Reverse the sorting of siblings.
        reverse: false,

        // How to sort siblings.  See later documentation.
        sortBy: null,

        // Files that should be placed first, regardless.  Explained below.
        sortFilesFirst: "**/index.{htm,html,jade,md}"
    })

This uses [metalsmith-plugin-kit] to match files.  The `.matchOptions` object can be filled with options to control how files are matched.


### Sorting Members

This is the most complex portion of the code.  It is also the reason that sorting functions are exported with the plugin; those are covered later.

First, let's discuss the `sortBy` option.  It is allowed to accept any of the following:

* `null` - Don't worry about sorting and let the plugin do it for you automatically.  The plugin sorts based on `ancestry.path`, case-insensitively.
* `"propertyName"` - All single strings are treated as property names and are sorted case-insensitively.
* `["propName1", "propName2"]` - Sort by multiple property names.  If the first property is identical in both file objects then it falls back to a second and third sort (as many as you define in the array).
* `function (a, b) {...}` - Use the defined function for sorting file objects.  You can compose one from functions you build and the sorting functions that the Ancestry module provides.

Because index files are typically the entry point and should be first, the `sortFilesFirst` property in the options allows you to configure this.  It also allows several types of inputs.

* `null` - This tells the plugin to sort with typical index files first.  It matches `index.htm`, `index.html`, `index.jade` and `index.md`.
* `"**/index.html"` - Strings match against the file using `metalsmith-plugin-kit.filenameMatcher`.  So you can specify exact filenames or patterns with wildcards.
* `/(^|\/|\\)index\.([^.]*)/` - Regular expression objects are allowed.  This one would match any file starting with `index.` with any extension but only one extension.
* `function (path) { ... }` - Define your own function for the utmost in control.
* `[ matcher1, matcher2 ]` - An array whose values are any of the above would also work.  In this way you can easily match multiple globs or a complex series of behavior with several functions.

In addition, you can easily reverse the sort by setting `reverse: true` in the options.


### Sorting Functions

On the `ancestory` function are some sorting properties. They are mostly exposed for easy testing but you are welcome to use them.

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


Upgrading
---------


### 1.2.0 -> 1.3.0

The option `.sortFilesFirst` no longer can accept objects with a `.match` property. This appeared to be unused functionality.

If you used `.matchOptions` and that controled how globs were used with `.sortFilesFirst`, you now need to set the new property `.sortFilesFirstOptions`.


### 1.1.0 -> 1.2.0

Backwards compatible. Only added the `.root` property.


### 1.0.0 -> 1.1.0

Properties were renamed in order to avoid confusion with additional functionality.  Change `.first`, `.last`, `.next` and`.previous` to `.firstMember`, `.lastMember`, `.nextMember` and `.prevMember`. Also, to make sure directories were the first-class citizens in the family tree, `.siblings` was renamed to `.members`.


API
---

<a name="module_metalsmith-ancestry"></a>

## metalsmith-ancestry
Metalsmith Ancestry - Generate a hierarchical listing of files based on
where they are in the file tree. Add useful navigation metadata to files
in your Metalsmith build.

**Example**  
```js
var ancestry = require("metalsmith-ancestry");

// Create your Metalsmith instance and add this like other middleware.
metalsmith.use(ancestry({
    // Options go here.
});
```

* [metalsmith-ancestry](#module_metalsmith-ancestry)
    * [module.exports(options)](#exp_module_metalsmith-ancestry--module.exports) ⇒ <code>function</code> ⏏
        * [~sortCombine(sorts)](#module_metalsmith-ancestry--module.exports..sortCombine) ⇒ <code>function</code>
        * [~sortStrings(a, b)](#module_metalsmith-ancestry--module.exports..sortStrings) ⇒ <code>number</code>
        * [~sortReverse(sortFunction)](#module_metalsmith-ancestry--module.exports..sortReverse) ⇒ <code>function</code>
        * [~sortByProperty(propName)](#module_metalsmith-ancestry--module.exports..sortByProperty) ⇒ <code>function</code>
        * [~sortByMatchingFilename(filesFirst, filesFirstOptions, ancestryProperty)](#module_metalsmith-ancestry--module.exports..sortByMatchingFilename) ⇒ <code>function</code>
        * [~buildSortFunction(sortBy, reverse, filesFirst, filesFirstOptions, ancestryProperty)](#module_metalsmith-ancestry--module.exports..buildSortFunction) ⇒ <code>function</code>
        * [~sortMembers(filesByFolder, sortFn)](#module_metalsmith-ancestry--module.exports..sortMembers)
        * [~assignParent(filesByFolder, ancestry)](#module_metalsmith-ancestry--module.exports..assignParent)
        * [~assignRoot(options, ancestry)](#module_metalsmith-ancestry--module.exports..assignRoot)
        * [~assignRelativeLinks(ancestry, suffix, list)](#module_metalsmith-ancestry--module.exports..assignRelativeLinks)
        * [~assignMemberLinks(ancestry)](#module_metalsmith-ancestry--module.exports..assignMemberLinks)
        * [~assignChildren(filesByFolder, sortFn, options, ancestry)](#module_metalsmith-ancestry--module.exports..assignChildren)
        * [~assignSiblings(options, ancestry)](#module_metalsmith-ancestry--module.exports..assignSiblings)
        * [~metalsmithFile](#module_metalsmith-ancestry--module.exports..metalsmithFile) : <code>Object</code>
        * [~ancestryOptions](#module_metalsmith-ancestry--module.exports..ancestryOptions) : <code>Object</code>
        * [~ancestry](#module_metalsmith-ancestry--module.exports..ancestry) : <code>Object</code>
        * [~ancestrySortBy](#module_metalsmith-ancestry--module.exports..ancestrySortBy) : <code>function</code> \| <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>null</code>

<a name="exp_module_metalsmith-ancestry--module.exports"></a>

### module.exports(options) ⇒ <code>function</code> ⏏
Factory to build middleware for Metalsmith.

**Kind**: Exported function  
**Params**

- options <code>module:metalsmith-ancestry~options</code>

<a name="module_metalsmith-ancestry--module.exports..sortCombine"></a>

#### module.exports~sortCombine(sorts) ⇒ <code>function</code>
Return a function that chains together multiple sort functions.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- sorts <code>Array.&lt;function()&gt;</code>

<a name="module_metalsmith-ancestry--module.exports..sortStrings"></a>

#### module.exports~sortStrings(a, b) ⇒ <code>number</code>
Returns the right value from sorting two strings.  Strings are sorted
case-insensitively.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- a <code>string</code>
- b <code>string</code>

<a name="module_metalsmith-ancestry--module.exports..sortReverse"></a>

#### module.exports~sortReverse(sortFunction) ⇒ <code>function</code>
Reverses a sort function.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- sortFunction <code>function</code>

<a name="module_metalsmith-ancestry--module.exports..sortByProperty"></a>

#### module.exports~sortByProperty(propName) ⇒ <code>function</code>
Return a function that will sort file objects by a property. This will
sort numbers appropriately as long as both values are numbers. Otherwise,
this falls back to a string-based sort.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- propName <code>string</code>

<a name="module_metalsmith-ancestry--module.exports..sortByMatchingFilename"></a>

#### module.exports~sortByMatchingFilename(filesFirst, filesFirstOptions, ancestryProperty) ⇒ <code>function</code>
Files that match should be sorted first.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- filesFirst <code>module:metalsmith-plugin-kit~matchList</code>
- filesFirstOptions <code>module:metalsmith-plugin-kit~matchOptions</code>
- ancestryProperty <code>string</code>

<a name="module_metalsmith-ancestry--module.exports..buildSortFunction"></a>

#### module.exports~buildSortFunction(sortBy, reverse, filesFirst, filesFirstOptions, ancestryProperty) ⇒ <code>function</code>
Create the sorting function using the options that were supplied.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- sortBy [<code>ancestrySortBy</code>](#module_metalsmith-ancestry--module.exports..ancestrySortBy)
- reverse <code>boolean</code>
- filesFirst <code>module:metalsmith-plugin-kit~matchList</code>
- filesFirstOptions <code>module:metalsmith-plugin-kit~matchOptions</code>
- ancestryProperty <code>string</code>

<a name="module_metalsmith-ancestry--module.exports..sortMembers"></a>

#### module.exports~sortMembers(filesByFolder, sortFn)
Sort all members so they are in the right order before we
determine the nextMember and prevMember links.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- filesByFolder <code>Object.&lt;string, Array&gt;</code> - Ancestories grouped by their folder.
- sortFn <code>function</code> - How children get sorted.

<a name="module_metalsmith-ancestry--module.exports..assignParent"></a>

#### module.exports~assignParent(filesByFolder, ancestry)
Link to the parent if one exists.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- filesByFolder <code>Object.&lt;string, Array&gt;</code> - Ancestories grouped by their folder.
- ancestry <code>ancestry</code>

<a name="module_metalsmith-ancestry--module.exports..assignRoot"></a>

#### module.exports~assignRoot(options, ancestry)
Follow parent links up until there are no more, then link directly
to the root.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- options <code>module:metalsmith-ancestry~options</code>
- ancestry <code>ancestry</code>

<a name="module_metalsmith-ancestry--module.exports..assignRelativeLinks"></a>

#### module.exports~assignRelativeLinks(ancestry, suffix, list)
Assigns the next, prev, first, last links for a given type.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- ancestry <code>ancestry</code>
- suffix <code>string</code>
- list <code>Array.&lt;files&gt;</code>

<a name="module_metalsmith-ancestry--module.exports..assignMemberLinks"></a>

#### module.exports~assignMemberLinks(ancestry)
Assign the member related links

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- ancestry <code>ancestry</code>

<a name="module_metalsmith-ancestry--module.exports..assignChildren"></a>

#### module.exports~assignChildren(filesByFolder, sortFn, options, ancestry)
Makes the list of children for each file object. The work
is only done on the first member and copied to all subsequent
members.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- filesByFolder <code>Object.&lt;string, Array&gt;</code> - Ancestories grouped by their folder.
- sortFn <code>function</code> - How children get sorted.
- options <code>module:metalsmith-ancestry~options</code>
- ancestry <code>ancestry</code>

<a name="module_metalsmith-ancestry--module.exports..assignSiblings"></a>

#### module.exports~assignSiblings(options, ancestry)
Siblings is simply a copy of the parent's children.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Params**

- options <code>module:metalsmith-ancestry~options</code>
- ancestry <code>ancestry</code>

<a name="module_metalsmith-ancestry--module.exports..metalsmithFile"></a>

#### module.exports~metalsmithFile : <code>Object</code>
This is a typical file object from Metalsmith.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Properties**

- contents <code>Buffer</code>  
- mode <code>string</code>  

<a name="module_metalsmith-ancestry--module.exports..ancestryOptions"></a>

#### module.exports~ancestryOptions : <code>Object</code>
Options for this plugin.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**See**: [https://github.com/fidian/metalsmith-plugin-kit](https://github.com/fidian/metalsmith-plugin-kit)  
**Properties**

- ancestryProperty <code>string</code> - The metadata property name to assign  
- match <code>module:metalsmith-plugin-kit~matchList</code> - Files to match. Defaults to all files.  
- matchOptions <code>module:metalsmith-plugin-kit~matchOptions</code> - Options controlling globbing behavior.  
- reverse <code>boolean</code>  
- sortBy [<code>ancestrySortBy</code>](#module_metalsmith-ancestry--module.exports..ancestrySortBy) - How to sort siblings.  
- sortFilesFirst <code>module:metalsmith-plugin-kit~matchList</code> - What files should come first in the sibling list. Defaults to index files with `htm`, `html`, `jade`, or `md` extensions.  
- sortFilesFirstOptions <code>module:metalsmith-plugin-kit~matchOptions</code> - Options controlling the globbing behavior of `sortFilesFirst`.  

<a name="module_metalsmith-ancestry--module.exports..ancestry"></a>

#### module.exports~ancestry : <code>Object</code>
This represents the type of object that is added as metadata to each
of the file objects.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  
**Properties**

- basename <code>string</code> - file.ext  
- children [<code>Array.&lt;metalsmithFile&gt;</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile) - First member in subfolders.  
- firstChild [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- firstMember [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- firstSibling [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- lastChild [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- lastMember [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- lastSibling [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- members [<code>Array.&lt;metalsmithFile&gt;</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile) - Files in same directory.  
- nextChild [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- nextMember [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- nextSibling [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- parent [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- path <code>string</code> - folder/file.ext  
- prevChild [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- prevMember [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- prevSibling [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- root [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile) - The top-most parent's parent's parent's parent.  
- self [<code>metalsmithFile</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile)  
- siblings [<code>Array.&lt;metalsmithFile&gt;</code>](#module_metalsmith-ancestry--module.exports..metalsmithFile) - First member in adjacent directories.  

<a name="module_metalsmith-ancestry--module.exports..ancestrySortBy"></a>

#### module.exports~ancestrySortBy : <code>function</code> \| <code>string</code> \| <code>Array.&lt;string&gt;</code> \| <code>null</code>
**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-ancestry--module.exports)  


Development
-----------

This uses Jasmine, Istanbul and ESLint for tests.

    # Install all of the dependencies
    npm install

    # Run the tests
    npm run test

This plugin is licensed under the [MIT License][License] with an additional non-advertising clause.  See the [full license text][License] for information.


[codecov-badge]: https://img.shields.io/codecov/c/github/tests-always-included/metalsmith-ancestry/master.svg
[codecov-link]: https://codecov.io/github/tests-always-included/metalsmith-ancestry?branch=master
[dependencies-badge]: https://img.shields.io/david/tests-always-included/metalsmith-ancestry.svg
[dependencies-link]: https://david-dm.org/tests-always-included/metalsmith-ancestry
[devdependencies-badge]: https://img.shields.io/david/dev/tests-always-included/metalsmith-ancestry.svg
[devdependencies-link]: https://david-dm.org/tests-always-included/metalsmith-ancestry#info=devDependencies
[License]: LICENSE.md
[metalsmith-hbt-md]: https://github.com/ahdiaz/metalsmith-hbt-md
[metalsmith-models]: https://github.com/jaichandra/metalsmith-models
[metalsmith-mustache-metadata]: https://github.com/tests-always-included/metalsmith-mustache-metadata
[metalsmith-plugin-kit]: https://github.com/fidian/metalsmith-plugin-kit
[metalsmith-relative-links]: https://github.com/tests-always-included/metalsmith-relative-links
[Mustache]: https://mustache.github.io/
[npm-badge]: https://img.shields.io/npm/v/metalsmith-ancestry.svg
[npm-link]: https://npmjs.org/package/metalsmith-ancestry
[travis-badge]: https://img.shields.io/travis/tests-always-included/metalsmith-ancestry/master.svg
[travis-link]: http://travis-ci.org/tests-always-included/metalsmith-ancestry
