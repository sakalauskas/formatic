'use strict';

var React = require('react');
var R = React.DOM;
var _ = require('underscore');

module.exports = function (formatic, plugin) {

  plugin.view = React.createClass({

    render: function () {

      return R.fieldset({},
        this.props.fields.map(function (field) {
          return field.component();
        }.bind(this))
      );
    }
  });
};