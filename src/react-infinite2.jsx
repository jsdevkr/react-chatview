var React = global.React || require('react');
var _cloneDeep = require('lodash.clonedeep');
var _clone = require('lodash.clone');
var _isEqual = require('lodash.isequal');
var _last = require('lodash.last');
var _sum = require('lodash.sum');

var Infinite = React.createClass({

  propTypes: {
    flipped: React.PropTypes.bool,
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,
    scrollLoadThreshold: React.PropTypes.number, // todo should be a percent
    onInfiniteLoad: React.PropTypes.func,

    diagnosticsDomElId: React.PropTypes.string,
    className: React.PropTypes.string
  },

  getDefaultProps () {
    return {
      flipped: false,
      loadingSpinnerDelegate: <div/>,
      timeScrollStateLastsForAfterUserScrolls: 150,
      className: ''
    };
  },

  getInitialState () {
    this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount

    this.scrollTop = 0; // regular mode initial scroll
    // In flipped mode, we need to measure the scrollable height from the DOM to write to the scrollTop.
    // Flipped and regular measured heights are symmetrical and don't depend on the scrollTop

    this.scrollHeight = undefined; // it's okay, this won't be read until the second render we think

    return {
      isInfiniteLoading: false
    };
  },

  componentWillUpdate (nextProps, nextState) {},

  render () {
    var displayables = _clone(this.props.children);
    if (this.props.flipped) {
      displayables.reverse();
    }

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    // Must not hook onScroll event directly - that will break hardware accelerated scrolling.
    // We poll it with requestAnimationFrame instead.
    return (
      <div className={this.props.className} ref="scrollable"
           style={{overflowX: 'hidden', overflowY: 'scroll'}}>
        <div ref="smoothScrollingWrapper">
          {this.props.flipped ? loadSpinner : null}
          {displayables}
          {this.props.flipped ? null : loadSpinner}
        </div>
      </div>
    );
  },

  // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
  // may have changed.
  pollScroll () {
    var domNode = this.getDOMNode();
    if (domNode.scrollTop !== this.scrollTop) {
      if (this.shouldTriggerLoad(domNode)) {
        this.setState({ isInfiniteLoading: true });
        var p = this.props.onInfiniteLoad();
        p.then(() => this.setState({ isInfiniteLoading: false }));
      }
      // the dom is ahead of the state
      this.updateScrollTop();
    }
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  isPassedThreshold (flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
    return flipped
        ? scrollTop <= scrollLoadThreshold
        : scrollTop >= (scrollHeight - clientHeight - scrollLoadThreshold);
  },

  shouldTriggerLoad (domNode) {
    var passedThreshold = this.isPassedThreshold(
        this.props.flipped,
        this.props.scrollLoadThreshold,
        domNode.scrollTop,
        domNode.scrollHeight,
        domNode.clientHeight);
    return passedThreshold && !this.state.isInfiniteLoading;
  },

  componentDidMount () {
    var scrollableDomEl = this.getDOMNode();

    // If there are not yet any children (they are still loading),
    // this is a no-op as we are at both the top and bottom of empty viewport
    var heightDifference = this.props.flipped
        ? scrollableDomEl.scrollHeight - scrollableDomEl.clientHeight
        : 0;

    scrollableDomEl.scrollTop = heightDifference;
    this.scrollTop = heightDifference;

    this.writeDiagnostics();
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  componentWillUnmount () {
    window.cancelAnimationFrame(this.rafRequestId);
  },

  componentDidUpdate (prevProps, prevState) {
    this.updateScrollTop();
    this.writeDiagnostics();
  },

  updateScrollTop() {
    var scrollableDomEl = this.getDOMNode();

    //todo this is only the happy path
    var newScrollTop = scrollableDomEl.scrollTop + (this.props.flipped
        ? scrollableDomEl.scrollHeight - (this.scrollHeight || 0)
        : 0);

    if (newScrollTop !== scrollableDomEl.scrollTop) {
      scrollableDomEl.scrollTop = newScrollTop;
    }

    this.scrollTop = scrollableDomEl.scrollTop;
    this.scrollHeight = scrollableDomEl.scrollHeight;

    // Setting scrollTop can halt user scrolling (and disables hardware acceleration)

    // Both cases - flipped and refular - have cases where the content expands in the proper direction,
    // or the content expands in the wrong direciton. Either history or new message in both cases.
    // We are only handling half of the cases. Or an image resized above or below us.
  },

  writeDiagnostics () {
    if (this.props.diagnosticsDomElId) {
      var diagnosticsString = JSON.stringify(this.state, undefined, 2);
      var domEl = document.getElementById(this.props.diagnosticsDomElId);
      if (domEl) {
        domEl.textContent = diagnosticsString;
      }
    }
  }
});


module.exports = Infinite;
global.Infinite = Infinite;
