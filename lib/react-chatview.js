'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _propTypes = require('prop-types');

var _propTypes2 = _interopRequireDefault(_propTypes);

var _lodash = require('lodash.clone');

var _lodash2 = _interopRequireDefault(_lodash);

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
} catch (e) {/* pass */}

var ChatView = function (_Component) {
  _inherits(ChatView, _Component);

  function ChatView(props) {
    _classCallCheck(this, ChatView);

    var _this = _possibleConstructorReturn(this, (ChatView.__proto__ || Object.getPrototypeOf(ChatView)).call(this, props));

    _this.onScroll = function () {
      if (_this.scrollable.scrollTop !== _this.scrollTop) {
        if (_this.shouldTriggerLoad()) {
          _this.setState({ isInfiniteLoading: true });
          var p = _this.props.onInfiniteLoad();
          p.then(function () {
            return _this.setState({ isInfiniteLoading: false });
          });
        }
        // the dom is ahead of the state
        _this.updateScrollTop();
      }
    };

    _this.pollScroll = function () {
      _this.onScroll();
      _this.rafRequestId = window.requestAnimationFrame(_this.pollScroll);
    };

    _this.isPassedThreshold = function (flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
      return flipped ? scrollTop <= scrollLoadThreshold : scrollTop >= scrollHeight - clientHeight - scrollLoadThreshold;
    };

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
    key: 'componentDidMount',
    value: function componentDidMount() {
      // If there are not yet any children (they are still loading),
      // this is a no-op as we are at both the top and bottom of empty viewport
      var heightDifference = this.props.flipped ? this.scrollable.scrollHeight - this.scrollable.clientHeight : 0;

      this.scrollable.scrollTop = heightDifference;
      this.scrollTop = heightDifference;

      // Unless passive events are supported, we must not hook onScroll event
      // directly - that will break hardware accelerated scrolling. We poll it
      // with requestAnimationFrame instead.
      if (supportsPassive) {
        this.scrollable.addEventListener('scroll', this.onScroll, { passive: true });
      } else {
        this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
      }

      // upper ref
      if (typeof this.props.returnScrollable === 'function') this.props.returnScrollable(this.scrollable);
    }

    // componentDidUpdate(prevProps, prevState) {

  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate() {
      this.updateScrollTop();
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.scrollable.removeEventListener('scroll', this.onScroll, { passive: true });
      window.cancelAnimationFrame(this.rafRequestId);
    }

    // componentWillUpdate(nextProps, nextState) {}

    // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
    // may have changed.

  }, {
    key: 'shouldTriggerLoad',
    value: function shouldTriggerLoad() {
      var passedThreshold = this.isPassedThreshold(this.props.flipped, this.props.scrollLoadThreshold, this.scrollable.scrollTop, this.scrollable.scrollHeight, this.scrollable.clientHeight);
      return passedThreshold && !this.state.isInfiniteLoading && this.props.shouldTriggerLoad();
    }
  }, {
    key: 'updateScrollTop',
    value: function updateScrollTop() {
      // todo this is only the happy path
      var newScrollTop = this.scrollable.scrollTop + (this.props.flipped ? this.scrollable.scrollHeight - (this.scrollHeight || 0) : 0);

      // if scrollHeightDifference is > 0 then something was removed from list
      var scrollHeightDifference = this.scrollHeight ? this.scrollHeight - this.scrollable.scrollHeight : 0;

      // if something was removed from list we need to include this difference in new scroll top
      if (this.props.flipped && scrollHeightDifference > 0) {
        newScrollTop += scrollHeightDifference;
      }

      if (newScrollTop !== this.scrollable.scrollTop) {
        this.scrollable.scrollTop = newScrollTop;
      }

      this.scrollTop = this.scrollable.scrollTop;
      this.scrollHeight = this.scrollable.scrollHeight;

      // Setting scrollTop can halt user scrolling (and disables hardware acceleration)

      // Both cases - flipped and refular - have cases where the content expands in the proper direction,
      // or the content expands in the wrong direciton. Either history or new message in both cases.
      // We are only handling half of the cases. Or an image resized above or below us.
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var displayables = (0, _lodash2.default)(this.props.children);
      if (this.props.flipped && !this.props.reversed) {
        displayables.reverse();
      }

      var loadSpinner = _react2.default.createElement(
        'div',
        { ref: function ref(e) {
            _this2.loadingSpinner = e;
          } },
        this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null
      );

      return _react2.default.createElement(
        'div',
        { className: this.props.className, ref: function ref(e) {
            _this2.scrollable = e;
          },
          style: { overflowX: 'hidden', overflowY: 'auto' }
        },
        _react2.default.createElement(
          'div',
          { ref: function ref(e) {
              _this2.smoothScrollingWrapper = e;
            } },
          this.props.flipped ? loadSpinner : null,
          displayables,
          this.props.flipped ? null : loadSpinner
        )
      );
    }
  }]);

  return ChatView;
}(_react.Component);

ChatView.propTypes = {
  flipped: _propTypes2.default.bool,
  reversed: _propTypes2.default.bool,
  scrollLoadThreshold: _propTypes2.default.number,
  shouldTriggerLoad: _propTypes2.default.func,
  onInfiniteLoad: _propTypes2.default.func.isRequired,
  loadingSpinnerDelegate: _propTypes2.default.element,
  className: _propTypes2.default.string,
  children: _propTypes2.default.node,
  returnScrollable: _propTypes2.default.func
};
exports.default = ChatView;


ChatView.defaultProps = {
  flipped: false,
  scrollLoadThreshold: 10,
  shouldTriggerLoad: function shouldTriggerLoad() {
    return true;
  },
  loadingSpinnerDelegate: _react2.default.createElement('div', null),
  className: ''
};
module.exports = exports['default'];