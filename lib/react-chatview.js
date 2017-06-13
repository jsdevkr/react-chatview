'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var supportsPassive = false;

try {
  var opts = Object.defineProperty({}, 'passive', {
    get: function get() {
      supportsPassive = true;
    }
  });
  window.addEventListener('test', null, opts);
} catch (e) {/* pass */
}

var ChatView = function (_React$Component) {
  _inherits(ChatView, _React$Component);

  function ChatView(props) {
    _classCallCheck(this, ChatView);

    var _this = _possibleConstructorReturn(this, (ChatView.__proto__ || Object.getPrototypeOf(ChatView)).call(this, props));

    _this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount
    _this.scrollTop = 0; // regular mode initial scroll
    _this.scrollHeight = undefined; // it's okay, this won't be read until the second render.
    // In flipped mode, we need to measure the scrollable height from the DOM to write to the scrollTop.
    // Flipped and regular measured heights are symmetrical and don't depend on the scrollTop

    _this.state = {
      isInfiniteLoading: false
    };
    return _this;
  }

  _createClass(ChatView, [{
    key: 'componentWillUpdate',
    value: function componentWillUpdate(nextProps, nextState) {}
  }, {
    key: 'render',
    value: function render() {
      var displayables = (0, _lodash2.default)(this.props.children);
      if (this.props.flipped) {
        displayables.reverse();
      }

      var loadSpinner = _react2.default.createElement(
        'div',
        { ref: 'loadingSpinner' },
        this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null
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
    }

    // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
    // may have changed.

  }, {
    key: 'onScroll',
    value: function onScroll() {
      var _this2 = this;

      var domNode = _reactDom2.default.findDOMNode(this);

      // if the containing component passed in an onscroll handler function as a property
      if (this.props.handleScroll) {
        this.props.handleScroll(domNode.scrollTop);
      }

      if (domNode.scrollTop !== this.scrollTop) {
        if (this.shouldTriggerLoad(domNode)) {
          this.setState({ isInfiniteLoading: true });
          var p = this.props.onInfiniteLoad();
          p.then(function () {
            return _this2.setState({ isInfiniteLoading: false });
          });
        }
        // the dom is ahead of the state
        this.updateScrollTop();
      }
    }
  }, {
    key: 'pollScroll',
    value: function pollScroll() {
      this.onScroll();
      this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
    }
  }, {
    key: 'isPassedThreshold',
    value: function isPassedThreshold(flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
      return flipped ? scrollTop <= scrollLoadThreshold : scrollTop >= scrollHeight - clientHeight - scrollLoadThreshold;
    }
  }, {
    key: 'shouldTriggerLoad',
    value: function shouldTriggerLoad(domNode) {
      var passedThreshold = this.isPassedThreshold(this.props.flipped, this.props.scrollLoadThreshold, domNode.scrollTop, domNode.scrollHeight, domNode.clientHeight);
      return passedThreshold && !this.state.isInfiniteLoading;
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
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
        scrollableDomEl.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
      } else {
        this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      var scrollableDomEl = _reactDom2.default.findDOMNode(this);
      scrollableDomEl.removeEventListener('scroll', this.onScroll.bind(this), { passive: true });
      window.cancelAnimationFrame(this.rafRequestId);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
      this.updateScrollTop();
    }
  }, {
    key: 'updateScrollTop',
    value: function updateScrollTop() {
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

      // Both cases - flipped and regular - have cases where the content expands in the proper direction,
      // or the content expands in the wrong direction. Either history or new message in both cases.
      // We are only handling half of the cases. Or an image re-sized above or below us.
    }
  }]);

  return ChatView;
}(_react2.default.Component);

exports.default = ChatView;


ChatView.defaultProps = {
  flipped: false,
  scrollLoadThreshold: 10,
  loadingSpinnerDelegate: _react2.default.createElement('div', null),
  className: ''
};

ChatView.propTypes = {
  flipped: _propTypes2.default.bool,
  scrollLoadThreshold: _propTypes2.default.number,
  onInfiniteLoad: _propTypes2.default.func.isRequired,
  handleScroll: _propTypes2.default.func,
  loadingSpinnerDelegate: _propTypes2.default.element,
  className: _propTypes2.default.string
};