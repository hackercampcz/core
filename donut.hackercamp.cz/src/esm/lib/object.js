import { isISODateTime } from "./validation.js";

/**
 * Executes a function on each of an objects own enumerable properties. The
 *  callback function will receive three arguments: the value of the current
 *  property, the name of the property, and the object being processed. This is
 *  roughly equivalent to the signature for callbacks to
 *  Array.prototype.forEach.
 * @param {Object} obj The object to act on.
 * @param {Function} callback The function to execute.
 * @returns {Object} Returns the given object.
 */
export function objectForeach(obj, callback) {
  Object.keys(obj).forEach(function(prop) {
    callback(obj[prop], prop, obj);
  });
  return obj;
}

/**
 * Walks through an object executing user defined functions at every node on the
 *  way down and back up. Functions will be given three arguments: the value
 *  of the current node, the name of the current node, and the object being
 *  being walked through. This roughly resembles the callback signature of
 *  Array.prototype.map.
 * @param {Object} obj The object to walk through.
 * @param {Function} [descentionFn = function () {return null;}] callback
 *  function to be executed at every node from the top down.
 * @param {Function} [ascentionFn = function () {return null;}] callback
 *  function to be executed at every node from the bottom up.
 * @returns {Object} Returns the object with empty values removed.
 */
export function objectWalk(obj, descentionFn, ascentionFn) {
  descentionFn = descentionFn
    || function() {
      return null;
    };
  ascentionFn = ascentionFn
    || function() {
      return null;
    };

  function walk(obj) {
    objectForeach(obj, function(val, prop, aObj) {
      descentionFn(val, prop, aObj);
      if (val instanceof Object) {
        walk(val);
        ascentionFn(val, prop, aObj);
      }
    });
    return obj;
  }

  return walk(obj);
}

/**
 * Walks trough given object and calls new Date(value) if ISO date
 * @param {Object} input object
 * @returns
 */
export function instatializeDates(input) {
  const output = structuredClone(input);
  objectWalk(output, (value, key, obj) => {
    if (isISODateTime(value)) {
      obj[key] = new Date(value);
    }
  });
  return output;
}
