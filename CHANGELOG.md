Changelog
=========


2017-09-26 - 1.4.0
------------------

* Added `.memberIndex` and `.siblingIndex` to see where you are in the sorted arrays.


2017-06-14 - 1.3.0
------------------

* Use metalsmith-plugin-kit to handle matching files.
* Removed `.forEach()` to speed up builds with a significant number of files. My crude tests brought a build down from 875ms to 700ms.
* Documentation update.


2017-04-27 - 1.2.1
------------------

* When sorting by a property, this detects if both values are numbers and sorts them numerically.
* Update dependencies.


2017-03-06 - 1.2.0
------------------

* Added `.root` property. Fully backward compatible.


2017-03-03 - 1.1.0
------------------

* Standardized property names. Breaks backwards compatibility when accessing `.next`, `.prev`, and others.


2016-12-27 - 1.0.0
------------------

* Initial release.
