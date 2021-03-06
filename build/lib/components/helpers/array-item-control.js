// # array-item-control component

/*
Render the remove and move buttons for an array field.
*/

'use strict';

var React = require('react');
var R = React.DOM;
var cx = require('classnames');

module.exports = React.createClass({

  displayName: 'ArrayItemControl',

  mixins: [require('../../mixins/helper')],

  onMoveBack: function onMoveBack() {
    this.props.onMove(this.props.index, this.props.index - 1);
  },

  onMoveForward: function onMoveForward() {
    this.props.onMove(this.props.index, this.props.index + 1);
  },

  onRemove: function onRemove() {
    this.props.onRemove(this.props.index);
  },

  render: function render() {
    return this.renderWithConfig();
  },

  renderDefault: function renderDefault() {
    var config = this.props.config;
    var field = this.props.field;

    var isLastItem = field.fieldIndex === 0 && field.parent.value.length === 1;

    var removeItemControl = config.createElement('remove-item', {
      field: field, onClick: this.onRemove, onMaybeRemove: this.props.onMaybeRemove,
      readOnly: isLastItem && !config.isRemovalOfLastArrayItemAllowed(field)
    });

    return R.div({ className: cx(this.props.classes) }, removeItemControl, this.props.index > 0 ? config.createElement('move-item-back', { field: field, onClick: this.onMoveBack }) : null, this.props.index < this.props.numItems - 1 ? config.createElement('move-item-forward', { field: field, onClick: this.onMoveForward }) : null);
  }
});