'use strict';
/* global CodeMirror */
/*eslint no-script-url:0 */

var React = require('react');
var ReactDOM = require('react-dom');
var TagTranslator = require('./tag-translator');
var _ = require('../../undash');
var cx = require('classnames');

var _require = require('../../utils');

var keyCodes = _require.keyCodes;

var toString = function toString(value) {
  if (_.isUndefined(value) || _.isNull(value)) {
    return '';
  }
  return String(value);
};

/*
   Editor for tagged text. Renders text like "hello {{firstName}}"
   with replacement labels rendered in a pill box. Designed to load
   quickly when many separate instances of it are on the same
   page.

   Uses CodeMirror to edit text. To save memory the CodeMirror node is
   instantiated when the user moves the mouse into the edit area.
   Initially a read-only view using a simple div is shown.
 */
module.exports = React.createClass({

  displayName: 'PrettyTextInput',

  mixins: [require('../../mixins/helper')],

  componentDidMount: function componentDidMount() {
    this.createEditor();
  },

  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
    if (prevState.codeMirrorMode !== this.state.codeMirrorMode) {
      // Changed from code mirror mode to read only mode or vice versa,
      // so setup the other editor.
      this.createEditor();
    }
    this.updateEditor();
  },

  componentWillUnmount: function componentWillUnmount() {
    if (this.state.codeMirrorMode) {
      this.removeCodeMirrorEditor();
    }
  },

  getInitialState: function getInitialState() {
    var selectedChoices = this.props.selectedChoices;
    var replaceChoices = this.props.replaceChoices;
    var translator = TagTranslator(selectedChoices.concat(replaceChoices), this.props.config.humanize);

    return {
      // With number values, onFocus never fires, which means it stays read-only. So convert to string.
      value: toString(this.props.value),
      codeMirrorMode: false,
      isChoicesOpen: false,
      replaceChoices: replaceChoices,
      translator: translator,
      hasChanged: false
    };
  },

  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    // If we're debouncing a change, then we should just ignore this props change,
    // because there will be another when we hit the trailing edge of the debounce.
    if (this.isDebouncingCodeMirrorChange) {
      return;
    }

    var selectedChoices = nextProps.selectedChoices;
    var replaceChoices = nextProps.replaceChoices;
    var nextState = {
      replaceChoices: replaceChoices,
      translator: TagTranslator(selectedChoices.concat(replaceChoices), this.props.config.humanize)
    };

    // Not sure what the null/undefined checks are here for, but changed from falsey which was breaking.
    if (this.state.value !== nextProps.value && !_.isUndefined(nextProps.value) && nextProps.value !== null) {
      nextState.value = toString(nextProps.value);
      if (this.state.hasChanged === false) {
        nextState.hasChanged = true;
      }
    }

    this.setState(nextState);
  },

  onChange: function onChange(newValue) {
    this.props.onChange(newValue);
  },

  handleChoiceSelection: function handleChoiceSelection(key, event) {
    var _this = this;

    var selectChoice = function selectChoice() {
      var pos = _this.state.selectedTagPos;
      var tag = '{{' + key + '}}';

      _this.isInserting = true;
      if (pos) {
        _this.codeMirror.replaceRange(tag, { line: pos.line, ch: pos.start }, { line: pos.line, ch: pos.stop });
      } else {
        _this.codeMirror.replaceSelection(tag, 'end');
      }
      _this.isInserting = false;
      _this.codeMirror.focus();

      _this.setState({ isChoicesOpen: false, selectedTagPos: null });
    };
    if (this.state.codeMirrorMode) {
      selectChoice();
    } else if (this.props.readOnly) {
      // hackety hack to stop dropdown choices from toggling
      event.stopPropagation();
      this.isInserting = true;
      this.onChange('{{' + key + '}}');
      this.isInserting = false;
      this.setState({ isChoicesOpen: false });
    } else {
      this.switchToCodeMirror(selectChoice);
    }
  },

  onFocusWrapper: function onFocusWrapper() {
    var _this2 = this;

    this.switchToCodeMirror(function () {
      _this2.codeMirror.focus();
      _this2.codeMirror.setCursor(_this2.codeMirror.lineCount(), 0);
    });
  },

  focus: function focus() {
    var _this3 = this;

    if (this.codeMirror) {
      this.focusCodeMirror();
    } else {
      this.switchToCodeMirror(function () {
        _this3.focusCodeMirror();
      });
    }
  },

  focusCodeMirror: function focusCodeMirror() {
    if (this.codeMirror) {
      this.codeMirror.focus();
    }
  },

  onFocusCodeMirror: function onFocusCodeMirror() {
    this.setState({ hasFocus: true });
    this.props.onFocus();
  },

  onBlur: function onBlur() {
    this.setState({ hasFocus: false });
    this.props.onBlur();
  },

  insertBtn: function insertBtn() {
    if (this.isReadOnly() && !this.hasReadOnlyControls()) {
      return null;
    }

    var onInsertClick = function onInsertClick() {
      this.setState({ selectedTagPos: null });
      this.onToggleChoices();
    };

    var props = {
      ref: 'toggle',
      onClick: onInsertClick.bind(this),
      readOnly: this.isReadOnly(),
      field: this.props.field
    };
    return this.props.config.createElement('insert-button', props, 'Insert...');
  },

  choices: function choices() {
    if (this.isReadOnly()) {
      return null;
    }

    return this.props.config.createElement('choices', {
      ref: 'choices',
      onFocusSelect: this.focusCodeMirror,
      choices: this.state.replaceChoices,
      open: this.state.isChoicesOpen,
      ignoreCloseNodes: this.getCloseIgnoreNodes,
      onSelect: this.handleChoiceSelection,
      onClose: this.onCloseChoices,
      isAccordion: this.props.isAccordion,
      field: this.props.field,
      onChoiceAction: this.onChoiceAction
    });
  },

  onChoiceAction: function onChoiceAction(choice) {
    this.setState({
      isChoicesOpen: !!choice.isOpen
    });
    this.onStartAction(choice.action, choice);
  },

  wrapperTabIndex: function wrapperTabIndex() {
    if (this.props.readOnly || this.state.codeMirrorMode) {
      return null;
    }
    return this.props.tabIndex || 0;
  },

  onKeyDown: function onKeyDown(event) {
    if (!this.isReadOnly()) {
      if (event.keyCode === keyCodes.ESC) {
        event.preventDefault();
        event.stopPropagation();
        if (this.state.isChoicesOpen) {
          this.onToggleChoices();
          this.focusCodeMirror();
        }
      } else if (!this.state.isChoicesOpen) {
        // TODO: sane shortcut for opening choices
        // Below does not work yet. Ends up dumping { into search input.
        // if (this.codeMirror) {
        //   if (event.keyCode === keyCodes['['] && event.shiftKey) {
        //     const cursor = this.codeMirror.getCursor();
        //     const value = this.codeMirror.getValue();
        //     const lines = value.split('\n');
        //     const line = lines[cursor.line];
        //     if (line) {
        //       const prevChar = line[cursor.ch - 1];
        //       if (prevChar === '{') {
        //         this.onToggleChoices();
        //       }
        //     }
        //   }
        // }
      } else {
          if (this.refs.choices && this.refs.choices.onKeyDown) {
            this.refs.choices.onKeyDown(event);
          }
        }
    }
  },

  render: function render() {
    return this.renderWithConfig();
  },

  renderDefault: function renderDefault() {
    var textBoxClasses = cx(_.extend({}, this.props.classes, {
      'pretty-text-box': true,
      placeholder: this.hasPlaceholder(),
      'has-focus': this.state.hasFocus
    }));

    // Render read-only version.
    return React.createElement(
      'div',
      { onKeyDown: this.onKeyDown, className: cx({ 'pretty-text-wrapper': true, 'choices-open': this.state.isChoicesOpen }),
        onMouseEnter: this.switchToCodeMirror, onTouchStart: this.switchToCodeMirror },
      React.createElement(
        'div',
        { className: textBoxClasses, tabIndex: this.wrapperTabIndex(),
          onFocus: this.onFocusWrapper, onBlur: this.onBlur },
        React.createElement('div', { ref: 'textBox', className: 'internal-text-wrapper' })
      ),
      this.insertBtn(),
      this.choices()
    );
  },

  getCloseIgnoreNodes: function getCloseIgnoreNodes() {
    return this.refs.toggle;
  },

  onToggleChoices: function onToggleChoices() {
    this.setChoicesOpen(!this.state.isChoicesOpen);
  },

  setChoicesOpen: function setChoicesOpen(isOpen) {
    var action = isOpen ? 'open-replacements' : 'close-replacements';
    this.onStartAction(action);
    this.setState({ isChoicesOpen: isOpen });
  },

  onCloseChoices: function onCloseChoices() {
    if (this.state.isChoicesOpen) {
      this.setChoicesOpen(false);
    }
  },

  createEditor: function createEditor() {
    if (this.state.codeMirrorMode) {
      this.createCodeMirrorEditor();
    } else {
      this.createReadonlyEditor();
    }
  },

  updateEditor: function updateEditor() {
    if (this.state.codeMirrorMode) {
      var codeMirrorValue = this.codeMirror.getValue();
      if (!this.hasPlaceholder() && codeMirrorValue !== this.state.value) {
        // switch back to read-only mode to make it easier to render
        this.removeCodeMirrorEditor();
        this.createReadonlyEditor();
        this.setState({
          codeMirrorMode: false
        });
      }
    } else {
      this.createReadonlyEditor();
    }
  },

  createCodeMirrorEditor: function createCodeMirrorEditor() {
    var value = this.hasPlaceholder() ? String(this.props.config.fieldPlaceholder(this.props.field)) : String(this.state.value);

    var options = {
      tabindex: this.props.tabIndex || 0,
      lineWrapping: true,
      value: value,
      readOnly: false,
      mode: null,
      extraKeys: {
        Tab: false,
        'Shift-Tab': false
      }
    };

    var textBox = this.refs.textBox;
    textBox.innerHTML = ''; // release any previous read-only content so it can be GC'ed

    this.codeMirror = CodeMirror(textBox, options);
    this.codeMirror.on('change', this.onCodeMirrorChange);
    this.codeMirror.on('focus', this.onFocusCodeMirror);

    this.tagCodeMirror();
  },

  tagCodeMirror: function tagCodeMirror() {
    var positions = this.state.translator.getTagPositions(this.codeMirror.getValue());
    var self = this;

    var tagOps = function tagOps() {
      positions.forEach(function (pos) {
        var node = self.createTagNode(pos);
        self.codeMirror.markText({ line: pos.line, ch: pos.start }, { line: pos.line, ch: pos.stop }, { replacedWith: node, handleMouseEvents: true });
      });
    };

    this.codeMirror.operation(tagOps);
  },

  onChangeAndTagCodeMirror: function onChangeAndTagCodeMirror() {
    if (!this.codeMirror) {
      // We might have erased our codemirror instance before hitting the trailing
      // end of the debounce. If so, get the value out of state.
      if (this.props.value !== this.state.value) {
        this.onChange(this.state.value);
      }
      return;
    }
    this.onChange(this.codeMirror.getValue());
    this.tagCodeMirror();
  },

  onCodeMirrorChange: function onCodeMirrorChange() {
    var _this4 = this;

    var newValue = this.codeMirror.getValue();
    this.setState({ value: newValue });

    // Immediately change and tag if inserting.
    if (this.isInserting) {
      this.onChangeAndTagCodeMirror();
      return;
    }

    // Otherwise, debounce so CodeMirror doesn't die.
    if (!this.debounceCodeMirrorChange) {
      this.debounceCodeMirrorChange = _.debounce(function () {
        _this4.isDebouncingCodeMirrorChange = false;
        _this4.onChangeAndTagCodeMirror();
      }, 200);
    }
    this.isDebouncingCodeMirrorChange = true;
    this.debounceCodeMirrorChange();
  },

  /* Return true if we should render the placeholder */
  hasPlaceholder: function hasPlaceholder() {
    return !this.state.hasChanged && this.props.field.placeholder && !this.state.value;
  },

  createReadonlyEditor: function createReadonlyEditor() {
    var textBoxNode = this.refs.textBox;

    if (this.hasPlaceholder()) {
      return ReactDOM.render(React.createElement(
        'span',
        null,
        this.props.field.placeholder
      ), textBoxNode);
    }

    var tokens = this.state.translator.tokenize(this.state.value);
    var self = this;
    var nodes = tokens.map(function (part, i) {
      if (part.type === 'tag') {
        var label = self.state.translator.getLabel(part.value);
        var props = { key: i, tag: part.value, replaceChoices: self.state.replaceChoices, field: self.props.field };
        return self.props.config.createElement('pretty-tag', props, label);
      }
      return React.createElement(
        'span',
        { key: i },
        part.value
      );
    });

    ReactDOM.render(React.createElement(
      'span',
      null,
      nodes
    ), textBoxNode);
  },

  removeCodeMirrorEditor: function removeCodeMirrorEditor() {
    var textBoxNode = this.refs.textBox;
    var cmNode = textBoxNode.firstChild;
    textBoxNode.removeChild(cmNode);
    this.codeMirror = null;
  },

  switchToCodeMirror: function switchToCodeMirror(cb) {
    var _this5 = this;

    if (this.isReadOnly()) {
      return; // never render in code mirror if read-only
    }

    if (!this.state.codeMirrorMode && !this.props.readOnly) {
      this.setState({ codeMirrorMode: true }, function () {
        if (_this5.codeMirror && _.isFunction(cb)) {
          cb();
        }
      });
    }
  },

  onTagClick: function onTagClick() {
    var cursor = this.codeMirror.getCursor();
    var pos = this.state.translator.getTrueTagPosition(this.state.value, cursor);

    this.setState({ selectedTagPos: pos });
    this.onToggleChoices();
  },

  createTagNode: function createTagNode(pos) {
    var node = document.createElement('span');
    var label = this.state.translator.getLabel(pos.tag);
    var config = this.props.config;

    var props = { onClick: this.onTagClick, field: this.props.field, tag: pos.tag };

    ReactDOM.render(config.createElement('pretty-tag', props, label), node);

    return node;
  }
});