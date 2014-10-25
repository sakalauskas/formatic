'use strict';

var React = require('react/addons');
var R = React.DOM;

module.exports = function (plugin) {

  plugin.exports.component = React.createClass({

    mixins: [require('./mixins/value')],

    getDefaultProps: function () {
      return {
        className: plugin.config.className,
        rows: plugin.config.rows || 5
      };
    },

    onChange: function (event) {
      var newValue = event.target.value;
      this.props.field.val(newValue);
    },

    render: function () {

      var field = this.props.field;

      return plugin.component('field')({
        field: field
      }, R.textarea({
        className: this.props.className,
        value: field.value,
        rows: field.rows || this.props.rows,
        onChange: this.onChange
      }));
    }
  });
};