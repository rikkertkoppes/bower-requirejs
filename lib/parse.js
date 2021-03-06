'use strict';
var path = require('path');
var _ = require('lodash');
var slash = require('slash');
var slice = Array.prototype.slice;
var warn = require('chalk').black.bgYellow;
var file = require('file-utils');
var primary = require('./primary');

/**
 * Parse bower dependency down to one or more primary
 * js files.
 */
module.exports = function (dep, name, baseUrl) {

  /**
   * Parse dependency
   */
  function dependency() {
    // If the dependency is a directory
    if (_.isString(dep) && file.isDir(dep)) {
      // Look for top level js, otherwise
      // bail out.
      dep = primary(name, dep);
      if (!dep) {
        return false;
      }
    }

    // If there are multiple files in the dependency
    if (_.isArray(dep) && dep.length > 1) {
      dep = filter(dep);
    }

    // If the dependency should be turned into an Array
    if (!_.isArray(dep)) {
      dep = [dep];
    }

    return {
      paths: paths()
    };
  }

  /**
   * Filter an Array down to only js files
   */
  function filter(arr) {
    var jsfiles = _.filter(arr, function (val) {
      return path.extname(val) === '.js';
    });

    return jsfiles;
  }

  /**
   * Find all paths associated with this dependency.
   */
  function paths() {
    var dependencies = {};
    var resolve = resolver(dependencies);
    _.each(dep, resolve);
    return dependencies;
  }

  /**
   * Disambiguate a dependency path if a dependency was
   * not explicitly listed in bower.json's main array
   * Some dependencies have multiple paths because there is more
   * than one .js file in bower.json's main attribute.
   */
  function resolver(dependencies) {
    return function (val, index, arr) {
      if (arr.length > 1) {
        _.extend(dependencies, dependencyByFilename(val));
      } else {
        _.extend(dependencies, dependencyByComponentName(name, val));
      }
    };
  }

  /**
   * Create dependency based off of filename
   */
  function dependencyByFilename(val) {
    var dep = {};
    var name = getName(path.basename(val));
    var filepath = getPath(val);
    dep[name] = filepath;
    return dep;
  }

  /**
   * Create dependency based off of component name
   */
  function dependencyByComponentName(componentName, val) {
    var dep = {};
    var name = getName(componentName);
    var filepath = getPath(val);
    dep[name] = filepath;
    return dep;
  }

  /**
   * Return a dependency name that strips out extensions
   * like .js or .min
   */
  function getName(name) {
    return filterName(name, 'js', 'min');
  }

  /**
   * Return a dependency path that is relative to the baseUrl
   * and has normalized slashes for Windows users
   */
  function getPath(val) {
    var filepath = relative(removeExtension(val, 'js'));
    filepath = normalizePath(filepath);
    return filepath;
  }

  /**
   * Remove extensions from file paths but ignore folders
   */
  function removeExtension(filepath, extension) {
    var newPath;
    if (extension[0] !== '.') {
      extension = '.'.concat(extension);
    }
    newPath = path.join(path.dirname(filepath), path.basename(filepath, extension));
    return newPath;
  }

  /**
   * Remove '.' separated extensions from library/file names
   * ex: filterName('typeahead.js', 'js') returns 'typeahead'
   * ex: filterName('foo.min.js', 'js, 'min') returns 'foo'
   */
  function filterName() {
    var oldName = arguments[0];
    var newName = _.difference(oldName.split('.'), slice.call(arguments, 1));

    // Re-attach any leftover pieces
    // ex: handlebars.runtime.js becomes handlebars.runtime
    if (newName.length > 1) {
      newName = newName.join('.');
    } else {
      newName = newName[0];
    }

    if (newName !== oldName) {
      console.log(warn('WARN'), 'Renaming ' + oldName + ' to ' + newName + '\n');
    }

    return newName;
  }

  /**
   * Fixup slashes in file paths for windows
   */
  function normalizePath(str) {
    return process.platform === 'win32' ? slash(str) : str;
  }

  /**
   * Generate a relative path name using the baseUrl. If
   * baseUrl was not defined then it will just use the dir
   * that contains the rjs config file.
   */
  function relative (filepath) {
    return path.relative(baseUrl, filepath);
  }

  return dependency();
};
