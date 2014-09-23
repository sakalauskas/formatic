'use strict';

var _ = require('underscore');

module.exports = function (formatic, plugin) {

  plugin.default = {};

  plugin.getValue = function (field) {
    var obj = {};
    field.each(function (child) {
      if (child.hasKey()) {
        obj[child.key()] = child.val();
      }
    });
    return obj;
  };

  plugin.setValue = function (field, value) {
    field.each(function (child) {
      if (child.hasKey()) {
        child.val(value[child.key()]);
      }
    });
  };
};