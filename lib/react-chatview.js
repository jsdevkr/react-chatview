'use strict';

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ChatView = _react2.default.createClass({
  displayName: 'ChatView',


  propTypes: {
    domNode: _react2.default.PropTypes.object,
    flipped: _react2.default.PropTypes.bool,
    scrollLoadThreshold: _react2.default.PropTypes.number,
    onInfiniteLoad: _react2.default.PropTypes.func,
    loadingSpinnerDelegate: _react2.default.PropTypes.element,
    className: _react2.default.PropTypes.string,
    enableAutoScroll: _react2.default.PropTypes.bool
  },

  getDefaultProps: function getDefaultProps() {
    return {
      flipped: false,
      scrollLoadThreshold: 10,
      loadingSpinnerDelegate: _react2.default.createElement('div', null),
      className: '',
      enableAutoScroll: true
    };
  },
  getInitialState: function getInitialState() {
    this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount
    this.scrollTop = 0; // regular mode initial scroll
    this.scrollHeight = undefined; // it's okay, this won't be read until the second render.
    // In flipped mode, we need to measure the scrollable height from the DOM to write to the scrollTop.
    // Flipped and regular measured heights are symmetrical and don't depend on the scrollTop

    return {
      isInfiniteLoading: false
    };
  },
  componentWillUpdate: function componentWillUpdate(nextProps, nextState) {},
  render: function render() {
    var displayables = (0, _lodash2.default)(this.props.children);

    var loadSpinner = _react2.default.createElement(
      'div',
      { ref: 'loadingSpinner' },
      this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null
    );

    // Must not hook onScroll event directly - that will break hardware accelerated scrolling.
    // We poll it with requestAnimationFrame instead.
    return _react2.default.createElement(
      'div',
      { className: this.props.className, ref: 'scrollable' },
      _react2.default.createElement(
        'div',
        { ref: 'smoothScrollingWrapper' },
        this.props.flipped ? loadSpinner : null,
        displayables,
        this.props.flipped ? null : loadSpinner
      )
    );
  },


  // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
  // may have changed.
  pollScroll: function pollScroll() {
    var _this = this;

    var domNode = this.props.domNode || _reactDom2.default.findDOMNode(this);
    if (domNode.scrollTop !== this.scrollTop) {
      if (this.shouldTriggerLoad(domNode) && this.props.onInfiniteLoad) {
        this.setState({ isInfiniteLoading: true });
        var p = this.props.onInfiniteLoad();
        p.then(function () {
          return _this.setState({ isInfiniteLoading: false });
        });
      }
      // the dom is ahead of the state
      this.updateScrollTop(domNode.scrollHeight !== this.scrollHeight);
    } else if (domNode.scrollHeight !== this.scrollHeight) {
      this.updateScrollTop();
    }
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },
  isPassedThreshold: function isPassedThreshold(flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
    return flipped ? scrollTop <= scrollLoadThreshold : scrollTop >= scrollHeight - clientHeight - scrollLoadThreshold;
  },
  shouldTriggerLoad: function shouldTriggerLoad(domNode) {
    var passedThreshold = this.isPassedThreshold(this.props.flipped, this.props.scrollLoadThreshold, domNode.scrollTop, domNode.scrollHeight, domNode.clientHeight);
    return passedThreshold && !this.state.isInfiniteLoading;
  },
  componentDidMount: function componentDidMount() {
    if (this.props.enableAutoScroll) {
      var scrollableDomEl = this.props.domNode || _reactDom2.default.findDOMNode(this);
      // If there are not yet any children (they are still loading),
      // this is a no-op as we are at both the top and bottom of empty viewport
      var heightDifference = this.props.flipped ? scrollableDomEl.scrollHeight - scrollableDomEl.clientHeight : 0;

      scrollableDomEl.scrollTop = heightDifference;
      this.scrollTop = heightDifference;
    }

    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },
  componentWillUnmount: function componentWillUnmount() {
    window.cancelAnimationFrame(this.rafRequestId);
  },
  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
    this.updateScrollTop();
  },
  updateScrollTop: function updateScrollTop() {
    if (this.props.enableAutoScroll) {
      var scrollableDomEl = this.props.domNode || _reactDom2.default.findDOMNode(this);

      //todo this is only the happy path
      var newScrollTop = scrollableDomEl.scrollTop + (this.props.flipped ? scrollableDomEl.scrollHeight - (this.scrollHeight || 0) : 0);

      if (newScrollTop !== scrollableDomEl.scrollTop) {
        scrollableDomEl.scrollTop = newScrollTop;
      }

      this.scrollTop = scrollableDomEl.scrollTop;
      this.scrollHeight = scrollableDomEl.scrollHeight;
    }

    // Setting scrollTop can halt user scrolling (and disables hardware acceleration)

    // Both cases - flipped and refular - have cases where the content expands in the proper direction,
    // or the content expands in the wrong direciton. Either history or new message in both cases.
    // We are only handling half of the cases. Or an image resized above or below us.
  }
});

module.exports = ChatView;