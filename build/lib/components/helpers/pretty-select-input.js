// # pretty-select-input component

/*
   Render an input to be used as the element for typing a custom value into a pretty select.
 */

'use strict';

var React = require('react');

module.exports = React.createClass({

  displayName: 'PrettySelectInput',

  mixins: [require('../../mixins/helper')],

  render: function render() {
    return this.renderWithConfig();
  },

  focus: function focus() {
    if (this.refs.textBox && this.refs.textBox.focus) {
      this.refs.textBox.focus();
    }
  },

  setChoicesOpen: function setChoicesOpen(isOpenChoices) {
    this.refs.textBox.setChoicesOpen(isOpenChoices);
  },

  renderDefault: function renderDefault() {
    return this.props.config.createElement('pretty-text-input', {
      ref: 'textBox',
      classes: this.props.classes,
      onChange: this.props.onChange,
      onFocus: this.props.onFocus,
      onBlur: this.props.onBlur,
      onAction: this.onBubbleAction,
      field: this.props.field,
      value: this.props.isEnteringCustomValue ? this.props.field.value : this.props.getDisplayValue(),
      selectedChoices: this.props.config.fieldSelectedReplaceChoices(this.props.field),
      replaceChoices: this.props.config.fieldReplaceChoices(this.props.field),
      onTagClick: this.onTagClick,
      readOnly: !this.props.isEnteringCustomValue,
      disabled: this.isReadOnly()
    });
  }

});