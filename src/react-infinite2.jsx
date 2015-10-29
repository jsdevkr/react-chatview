var React = global.React || require('react');
var _cloneDeep = require('lodash.clonedeep');
var _clone = require('lodash.clone');
var _isEqual = require('lodash.isequal');
var _last = require('lodash.last');
var _sum = require('lodash.sum');
var ViewState = require('./ViewState');

var Infinite = React.createClass({

  propTypes: {
    containerHeight: React.PropTypes.number.isRequired, // total height of the visible window.
    flipped: React.PropTypes.bool,
    handleScroll: React.PropTypes.func, // What is this for? Not used in examples.
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,
    infiniteLoadBeginBottomOffset: React.PropTypes.number,
    onInfiniteLoad: React.PropTypes.func,

    diagnosticsDomElId: React.PropTypes.string,
    className: React.PropTypes.string
  },

  getDefaultProps () {
    return {
      flipped: false,
      loadingSpinnerDelegate: <div/>,
      handleScroll: () => {},
      timeScrollStateLastsForAfterUserScrolls: 150,
      className: ''
    };
  },

  componentWillMount () {},

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
        this.props.containerHeight,
        this.measuredItemsHeight,
        this.measuredLoadSpinner,
        React.Children.count(this.props.children));

    return {
      computedView: viewState,
      isFirstRender: true,
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
           style={buildScrollableStyle(viewState.apertureHeight)}>
        <div ref="smoothScrollingWrapper" style={this.state.isScrolling ? { pointerEvents: 'none' } : {}}>
          {this.props.flipped ? loadSpinner : null}
          {displayables}
          {this.props.flipped ? null : loadSpinner}
        </div>
      </div>
    );
  },

  pollScroll () {
    // We are allowed to recompute the viewState here, but we are not
    // allowed to write to scrollTop here, which can abruptly halt in-progress user scrolling.
    var scrollTop = this.refs.scrollable.getDOMNode().scrollTop;
    if (scrollTop !== this.state.computedView.apertureTop) {
      this.manageScrollTimeouts();
      var nextViewState = this.setViewState(this.props, scrollTop);
      if (this.shouldTriggerLoad(scrollTop, nextViewState)) {
        this.setState({ isInfiniteLoading: true });
        var p = this.props.onInfiniteLoad();
        p.then(() => this.setState({ isInfiniteLoading: false }));
      }
      // DO NOT effect domEl.scrollTop. Do this when the new children hit dom in didUpdate
    }

    /**
     * If the scrollableHeight has changed, due to a layout reflow (an image loaded or content reized),
     * we might need to touch up the scrollTop here to prevent a stutter.
     *
     * If the content resize was underneath scrollBottom, we don’t care - don’t do anything and nothing
     * will stutter.
     *
     * If the content resize was above scrollBottom, we do care, fix up scrollTop to avoid a stutter.
     *
     * This code only accounts for the case where the page first loads and we're looking at the very first
     * message, so all content is above scrollBottom and needs fixup. For example the image initial loads.
     * This is fine since messages aren't going to randomly be resizing other than as they first come in
     * at the bottom to generate previews and load images.
     *
     * It's possible to do better, but the code is complicated. See history of ViewState.js which
     * had code to figure out visibleIndexStart and visibleIndexEnd, which is a start.
     */
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item:not(.infinite-load-spinner)');
    var exactChildrenHeight = _sum(measureChildHeights(domItems));
    if (this.props.flipped && exactChildrenHeight !== this.state.computedView.measuredItemsHeight) {
      var prevExactChildrenHeight = this.state.computedView.measuredItemsHeight;
      var prevExactLoadSpinnerHeight = this.state.computedView.measuredLoadSpinner;
      var heightDifference = exactChildrenHeight - (prevExactChildrenHeight + prevExactLoadSpinnerHeight);

      // Allowed to effect scrollTop here since the user is very unlikely to be scrolling when a reflow happens.
      // reflows happen after events like an infinite load or initial load, when user can’t be scrolling.
      this.getDOMNode().scrollTop += heightDifference;
    }

    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  setViewState (props, scrollTop) {
    // Can't inspect props directly, sometimes we're dealing with a future view state from
    // componentWillReceiveNewProps. That method can't setState, so we can safely inspect this.state.
    var nextViewState = ViewState.computeViewState(
        scrollTop,
        props.containerHeight,
        this.measuredItemsHeight,
        this.measuredLoadSpinner,
        React.Children.count(props.children));

    this.setState({computedView: nextViewState, isFirstRender: false});
    return nextViewState;
  },

  shouldTriggerLoad (scrollTop, viewState) {
    var new_visibleEnd_DistanceFromFront = !this.props.flipped
        ? scrollTop
        : viewState.measuredItemsHeight - scrollTop;

    var whatIsThisNumber =
        viewState.measuredItemsHeight -
        viewState.apertureHeight -
        this.props.infiniteLoadBeginBottomOffset;
    var triggerLoad = (new_visibleEnd_DistanceFromFront > whatIsThisNumber);

    return triggerLoad && !this.state.isInfiniteLoading;
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

  componentWillReceiveProps (nextProps) {
    const didLoadOccur = React.Children.count(this.props.children) !== React.Children.count(nextProps.children);
    if (didLoadOccur) {
      // https://github.com/facebook/react/issues/2659
      this.setViewState(nextProps, this.getDOMNode().scrollTop);
      // The new children are about to be rendered. We haven't measured them yet. Somehow we need to adjust the
      // scrollTop to account for any new children that loaded above us. Render them now without adjusting scrollTop.
      // Then, browser will reflow, then we can measure the scrollTop in didUpdate and fix it up,
      // this happens before repaint.  https://github.com/facebook/react/issues/2659
    }
  },

  componentDidMount () {
    // Measure the heights of the item DOM nodes as rendered and laid out.
    // We have not measured their heights yet.
    // Do not store this in React state, because the view doesn't depend on them
    // and we don't want to cause a re-render.
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item:not(.infinite-load-spinner)');
    this.measuredItemsHeight = _sum(measureChildHeights(domItems));

    if (this.props.flipped) {
      // Set scrollbar position to all the way at bottom.
      var scrollableDomEl = this.refs.scrollable.getDOMNode();

      // this fires onScroll event, which will reset the state and cause another render (reversed this time)
      scrollableDomEl.scrollTop = scrollableDomEl.scrollHeight - this.props.containerHeight;
    }

    this.writeDiagnostics();
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  componentWillUnmount () {
    window.cancelAnimationFrame(this.rafRequestId);
  },

  componentDidUpdate (prevProps, prevState) {
    // Measure item node heights again because they may have changed.
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item:not(.infinite-load-spinner)');
    var updatedHeights = measureChildHeights(domItems);
    if (this.props.flipped) {
      updatedHeights.reverse();
    }

    this.measuredItemsHeight = _sum(updatedHeights);
    this.measuredLoadSpinner = measureDomHeight(this.refs.loadingSpinner.getDOMNode());

    var loadedMoreChildren = this.state.computedView.numChildren !== prevState.computedView.numChildren;
    // Will need to check the height difference, not the num children, TODO.
    // if flipped and the measuredHeight changed, adjust the scrollTop so user perceives no jump if items
    // are loaded above them in the DOM. This needs to happen in forwards mode too but the math will be different,
    // e.g. in the case of a new message came, or an image resized below us.

    if (loadedMoreChildren && this.props.flipped) {
      // We have just measured the heights right above! The viewState measuredChildrenHeights is one tick behind, i think.
      var exactChildrenHeight = this.measuredItemsHeight;
      var prevExactChildrenHeight = this.state.computedView.measuredItemsHeight;
      var prevExactLoadSpinnerHeight = this.state.computedView.measuredLoadSpinner;
      var heightDifference = exactChildrenHeight - (prevExactChildrenHeight + prevExactLoadSpinnerHeight);

      // Setting scrollTop can halt user scrolling (and disables hardware acceleration)
      // In firefox, the user scrolling actually is interrupted. Other browsers can keep up.
      // Basically, we can never ever write to scrollTop while the user is scrolling. We may write to it
      // only when the scrolling is stopped. That's why we're doing it here when we receive new children,
      // the user is probably already waiting and not actively scrolling.
      this.getDOMNode().scrollTop += heightDifference; // will cause viewState to recompute next tick
    }

    this.writeDiagnostics();
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


function buildHeightStyle (height) {
  return {
    width: '100%',
    height: Math.ceil(height) + 'px'
  };
}


function buildScrollableStyle(apertureHeight) {
  return {
    height: apertureHeight,
    overflowX: 'hidden',
    overflowY: 'scroll'
  };
}


module.exports = Infinite;
global.Infinite = Infinite;
