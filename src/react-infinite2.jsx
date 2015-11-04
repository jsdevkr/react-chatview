var React = global.React || require('react');
var _cloneDeep = require('lodash.clonedeep');
var _clone = require('lodash.clone');
var _isEqual = require('lodash.isequal');
var _last = require('lodash.last');
var _sum = require('lodash.sum');
var ViewState = require('./ViewState');

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
    this.measuredItemsHeight = null;
    this.measuredLoadSpinner = 0; // if we have a load spinner, this is the last measured height
    // Stored out-of-band of react state because we don't want to trigger component updates when
    // we measure it in a lifecycle method. They are duplicated into react state (part of the viewState)
    // but that is just to provide consistent access to past values of the system.
    this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount


    var scrollTop = 0; // regular mode initial scroll
    // In flipped mode, we need to measure the scrollable height from the DOM to write to the scrollTop.
    // Flipped and regular measured heights are symmetrical and don't depend on the scrollTop

    var viewState = ViewState.computeViewState(
        scrollTop,
        undefined, // it's okay, this won't be read until the second render we think
        this.measuredItemsHeight,
        this.measuredLoadSpinner);

    return {
      computedView: viewState,
      scrollTimeout: null,
      isScrolling: false,
      isInfiniteLoading: false
    };
  },

  componentWillUpdate (nextProps, nextState) {},

  render () {
    var viewState = this.state.computedView;
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
        <div ref="smoothScrollingWrapper" style={this.state.isScrolling ? { pointerEvents: 'none' } : {}}>
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
    if (domNode.scrollTop !== this.state.computedView.scrollTop) {
      this.manageScrollTimeouts();
      var nextViewState = this.setViewState(this.props, domNode);
      if (this.shouldTriggerLoad(domNode)) {
        this.setState({ isInfiniteLoading: true });
        var p = this.props.onInfiniteLoad();
        p.then(() => this.setState({ isInfiniteLoading: false }));
      }
      // the dom is ahead of the state
      this.updateScrollTop(this.state.computedView, 'pollScroll');
    }
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  setViewState (props, domNode) {
    // Can't inspect props directly, sometimes we're dealing with a future view state from
    // componentWillReceiveNewProps. That method can't setState, so we can safely inspect this.state.
    var nextViewState = ViewState.computeViewState(
        domNode.scrollTop,
        domNode.scrollHeight,
        this.measuredItemsHeight,
        this.measuredLoadSpinner);

    this.setState({computedView: nextViewState});
    return nextViewState;
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

  manageScrollTimeouts() {
    // Maintains a series of timeouts to set this.state.isScrolling
    // to be true when the element is scrolling.

    if (this.state.scrollTimeout) {
      clearTimeout(this.state.scrollTimeout);
    }

    var that = this,
        scrollTimeout = setTimeout(() => {
          that.setState({
            isScrolling: false,
            scrollTimeout: null
          })
        }, this.props.timeScrollStateLastsForAfterUserScrolls);

    this.setState({
      isScrolling: true,
      scrollTimeout: scrollTimeout
    });
  },

  componentDidMount () {
    var scrollableDomEl = this.getDOMNode();

    // If there are not yet any children (they are still loading),
    // this is a no-op as we are at both the top and bottom of empty viewport
    var heightDifference = this.props.flipped
        ? scrollableDomEl.scrollHeight - scrollableDomEl.clientHeight
        : 0;

    scrollableDomEl.scrollTop = heightDifference;

    this.writeDiagnostics();
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  componentWillUnmount () {
    window.cancelAnimationFrame(this.rafRequestId);
  },

  componentDidUpdate (prevProps, prevState) {
    this.updateScrollTop(prevState.computedView, 'componentDidUpdate');
    this.writeDiagnostics();
  },

  updateScrollTop(prevComputedView, debug) {
    /*
     if (loadedMoreChildren && this.props.flipped) {
     // We have just measured the heights right above! The viewState measuredChildrenHeights is one tick behind, i think.
     var exactChildrenHeight = this.measuredItemsHeight;
     var prevExactChildrenHeight = this.state.computedView.measuredItemsHeight;
     var prevExactLoadSpinnerHeight = this.state.computedView.measuredLoadSpinner;
     var heightDifference = exactChildrenHeight - (prevExactChildrenHeight + prevExactLoadSpinnerHeight);
     }
     */

    var scrollableDomEl = this.getDOMNode();

    console.log(debug, scrollableDomEl.scrollTop, scrollableDomEl.scrollHeight, prevComputedView.scrollHeight);

    //todo this is only the happy path
    scrollableDomEl.scrollTop += this.props.flipped
        ? scrollableDomEl.scrollHeight - prevComputedView.scrollHeight
        : 0;

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

function measureDomHeight(domEl) {
  return domEl.getClientRects()[0].height;
}

function measureChildHeights (domItems) {
  // clientHeight doesn't account for the border.
  // offsetHeight does, but it double counts some things.
  // It doesn't really matter - a few pixels isn't a big deal for this component.
  var xs = [];
  for (var i=0; i<domItems.length; ++i) {
    //var elHeight = domItems[i].clientHeight;
    var elHeight = measureDomHeight(domItems[i]);
    xs.push(elHeight);
  }
  return xs;
}

module.exports = Infinite;
global.Infinite = Infinite;
