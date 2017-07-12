'use strict';

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var supportsPassive = false;
try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function get() {
      supportsPassive = true;
    }
  });
  window.addEventListener('test', null, opts);
} catch (e) {/* pass */}

var ChatView = _react2.default.createClass({
  displayName: 'ChatView',


  propTypes: {
    flipped: _react2.default.PropTypes.bool,
    scrollLoadThreshold: _react2.default.PropTypes.number,
    onInfiniteLoad: _react2.default.PropTypes.func.isRequired,
    usePropLoading: _react2.default.PropTypes.bool,
    isInfiniteLoading: _react2.default.PropTypes.bool,
    loadingSpinnerDelegate: _react2.default.PropTypes.element,
    className: _react2.default.PropTypes.string
  },

  getDefaultProps: function getDefaultProps() {
    return {
      flipped: false,
      scrollLoadThreshold: 10,
      usePropLoading: false,
      loadingSpinnerDelegate: _react2.default.createElement('div', null),
      className: ''
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
    if (this.props.flipped) {
      displayables.reverse();
    }

    var loadSpinner = _react2.default.createElement(
      'div',
      { ref: 'loadingSpinner' },
      this.getIsInfiniteLoading() ? this.props.loadingSpinnerDelegate : null
    );

    return _react2.default.createElement(
      'div',
      { className: this.props.className, ref: 'scrollable',
        style: { overflowX: 'hidden', overflowY: 'scroll' } },
      _react2.default.createElement(
        'div',
        { ref: 'smoothScrollingWrapper' },
        this.props.flipped ? loadSpinner : null,
        displayables,
        this.props.flipped ? null : loadSpinner
      )
    );
  },
  getIsInfiniteLoading: function getIsInfiniteLoading() {
    return this.props.usePropLoading ? this.props.isInfiniteLoading : this.state.isInfiniteLoading;
  },


  // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
  // may have changed.
  onScroll: function onScroll() {
    var _this = this;

    var domNode = _reactDom2.default.findDOMNode(this);
    if (domNode.scrollTop !== this.scrollTop) {
      if (this.shouldTriggerLoad(domNode)) {
        if (!this.props.usePropLoading) {
          this.setState({ isInfiniteLoading: true });
        }
        var p = this.props.onInfiniteLoad();
        if (!this.props.usePropLoading) {
          p.then(function () {
            return _this.setState({ isInfiniteLoading: false });
          });
        }
      }
      // the dom is ahead of the state
      this.updateScrollTop();
    }
  },
  pollScroll: function pollScroll() {
    this.onScroll();
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },
  isPassedThreshold: function isPassedThreshold(flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
    return flipped ? scrollTop <= scrollLoadThreshold : scrollTop >= scrollHeight - clientHeight - scrollLoadThreshold;
  },
  shouldTriggerLoad: function shouldTriggerLoad(domNode) {
    var passedThreshold = this.isPassedThreshold(this.props.flipped, this.props.scrollLoadThreshold, domNode.scrollTop, domNode.scrollHeight, domNode.clientHeight);
    return passedThreshold && !this.getIsInfiniteLoading();
  },
  componentDidMount: function componentDidMount() {
    var scrollableDomEl = _reactDom2.default.findDOMNode(this);

    // If there are not yet any children (they are still loading),
    // this is a no-op as we are at both the top and bottom of empty viewport
    var heightDifference = this.props.flipped ? scrollableDomEl.scrollHeight - scrollableDomEl.clientHeight : 0;

    scrollableDomEl.scrollTop = heightDifference;
    this.scrollTop = heightDifference;

    // Unless passive events are supported, we must not hook onScroll event
    // directly - that will break hardware accelerated scrolling. We poll it
    // with requestAnimationFrame instead.
    if (supportsPassive) {
      scrollableDomEl.addEventListener('scroll', this.onScroll, { passive: true });
    } else {
      this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
    }
  },
  componentWillUnmount: function componentWillUnmount() {
    var scrollableDomEl = _reactDom2.default.findDOMNode(this);
    scrollableDomEl.removeEventListener('scroll', this.onScroll, { passive: true });
    window.cancelAnimationFrame(this.rafRequestId);
  },
  componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
    this.updateScrollTop();
  },
  updateScrollTop: function updateScrollTop() {
    var scrollableDomEl = _reactDom2.default.findDOMNode(this);

    //todo this is only the happy path
    var newScrollTop = scrollableDomEl.scrollTop + (this.props.flipped ? scrollableDomEl.scrollHeight - (this.scrollHeight || 0) : 0);

    // if scrollHeightDifference is > 0 then something was removed from list
    var scrollHeightDifference = this.scrollHeight ? this.scrollHeight - scrollableDomEl.scrollHeight : 0;

    // if something was removed from list we need to include this difference in new scroll top
    if (this.props.flipped && scrollHeightDifference > 0) {
      newScrollTop += scrollHeightDifference;
    }

    if (newScrollTop !== scrollableDomEl.scrollTop) {
      scrollableDomEl.scrollTop = newScrollTop;
    }

    this.scrollTop = scrollableDomEl.scrollTop;
    this.scrollHeight = scrollableDomEl.scrollHeight;

    // Setting scrollTop can halt user scrolling (and disables hardware acceleration)

    // Both cases - flipped and refular - have cases where the content expands in the proper direction,
    // or the content expands in the wrong direciton. Either history or new message in both cases.
    // We are only handling half of the cases. Or an image resized above or below us.
  }
});

module.exports = ChatView;