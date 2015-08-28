var React = global.React || require('react');
var _clone = require('lodash.clone');
var _isEqual = require('lodash.isequal');
var spliceArraySegmentAt = require('./utils/splice_array_segment_at');
var reductions = require('./utils/reductions');
var xor = require('./utils/xor');
var ViewState = require('./ViewState');

var Infinite = React.createClass({

  propTypes: {

    maxChildren: React.PropTypes.number.isRequired, // max # visible items (e.g. # of blank items that fit)
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

  getInitialState () {
    this.measuredHeights = []; // actual heights of items measured from dom as we see them
    this.measuredDistances = []; // computed pixel distance of each item from the window top
    // Stored out-of-band of react state because we don't want to trigger component updates when
    // we measure it in a lifecycle method.
    this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount


    /**
     * Always ignore flipped mode the first render.
     * Flipped mode needs a dom measurement, but the modes are symmetrical so we can measure it from
     * regular mode. The first "frame" will render regular mode, but the very next tick we will render
     * in flipped mode.
     * It's okay - we can't set the scrollbar pos to the bottom until after first render also.
     * After first render, we set the scrollbar pos, which triggers a new render, which will
     * properly render flipped.
     */
    var flipped = false;
    var scrollTop = 0; // regular mode initial scroll
    var prevMeasuredScrollableHeight = null; // Required for flipped mode only.

    var viewState = ViewState.computeViewState(
        scrollTop,
        this.props.containerHeight,
        this.measuredDistances,
        prevMeasuredScrollableHeight,
        React.Children.count(this.props.children),
        this.props.maxChildren,
        flipped);

    return {
      computedView: viewState,
      isFirstRender: true,
      scrollTimeout: null,
      isScrolling: false,
      isInfiniteLoading: false
    };
  },

  componentWillMount () {},

  componentWillUpdate (nextProps, nextState) {
    if (this.state.computedView.apertureTop !== nextState.computedView.apertureTop) {
      verifyVisibleRangeMonotonicallyIncreasing(
          nextProps.flipped, this.state.computedView.apertureTop, nextState.computedView.apertureTop,
          this.state.computedView, nextState.computedView
      );
    }
  },


  render () {
    var viewState = this.state.computedView;
    var displayables = this.props.children.slice(viewState.visibleStart, viewState.visibleEnd);
    if (this.props.flipped) {
      displayables.reverse();
    }

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    var topSpace = !this.props.flipped ? viewState.frontSpace : viewState.backSpace;
    var bottomSpace = !this.props.flipped ? viewState.backSpace : viewState.frontSpace;

    // Must not hook onScroll event directly - that will break hardware accelerated scrolling.
    // We poll it with requestAnimationFrame instead.
    return (
      <div className={this.props.className} ref="scrollable"
           style={buildScrollableStyle(viewState.apertureHeight)}>
        <div ref="smoothScrollingWrapper" style={this.state.isScrolling ? { pointerEvents: 'none' } : {}}>
          {this.props.flipped ? loadSpinner : null}
          <div ref="topSpacer" style={buildHeightStyle(topSpace)}/>
          {displayables}
          <div ref="bottomSpacer" style={buildHeightStyle(bottomSpace)}/>
          {this.props.flipped ? null : loadSpinner}
        </div>
      </div>
    );
  },

  pollScroll () {
    var scrollableDomEl = this.refs.scrollable.getDOMNode();
    if (scrollableDomEl.scrollTop !== this.state.computedView.apertureTop) {
      this.onScroll(scrollableDomEl);
    }

    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  onScroll (scrollableDomEl) {
    var scrollTop = scrollableDomEl.scrollTop;
    this.manageScrollTimeouts();
    var nextViewState = ViewState.computeViewState(
        scrollTop,
        this.props.containerHeight,
        this.measuredDistances,
        this.state.computedView.measuredScrollableHeight,
        React.Children.count(this.props.children),
        this.props.maxChildren,
        this.props.flipped);

    // if flipped and the measuredHeight changed, adjust the scrollTop here. hack
    var heightDifference = nextViewState.measuredScrollableHeight - nextViewState.prevMeasuredScrollableHeight;
    if (!this.state.isFirstRender && this.props.flipped && heightDifference !== 0) {
      // This line kills performance in firefox and probably breaks hw accelerated scrolling in all browsers.
      // One possible solution is to wait for the scrolling to settle before adjusting this.
      // Or, better, figure out a way to adjust this by changing the spacer heights, never the scrollTop.
      scrollableDomEl.scrollTop = scrollTop + heightDifference; // !!! This causes onScroll to fire again with new scrollTop !!!
    }

    if (this.shouldTriggerLoad(scrollTop, nextViewState)) {
      this.setState({ isInfiniteLoading: true, computedView: nextViewState, isFirstRender: false });
      this.props.onInfiniteLoad();
    }
    else {
      this.setState({ computedView: nextViewState, isFirstRender: false });
    }
  },

  shouldTriggerLoad (scrollTop, viewState) {
    if (!viewState.allHeightsMeasured) {
      return false; // If we haven't seen all the nodes, we aren't ready to trigger a load. -- this is wrongish
    }

    var new_apertureTop = scrollTop;
    var new_visibleEnd_DistanceFromFront = !this.props.flipped
        ? new_apertureTop
        : viewState.measuredScrollableHeight - new_apertureTop;

    var whatIsThisNumber =
        viewState.measuredChildrenHeight -
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
    this.setState({
      // preloadBatchSize
      isInfiniteLoading: nextProps.isInfiniteLoading !== undefined
          ? nextProps.isInfiniteLoading : this.state.isInfiniteLoading
    })
  },

  componentDidMount () {
    // Measure the heights of the item DOM nodes as rendered and laid out.
    // We have not measured their heights yet.
    // Do not store this in React state, because the view doesn't depend on them
    // and we don't want to cause a re-render.
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item:not(.infinite-load-spinner)');
    this.measuredHeights = measureChildHeights(domItems);
    this.measuredDistances = this.measuredHeights.length > 0
        ? reductions(this.measuredHeights, (acc, val) => { return acc+val; })
        : [];

    if (this.props.flipped) {
      // Set scrollbar position to all the way at bottom.
      var scrollableDomEl = this.refs.scrollable.getDOMNode();

      // API is scrollTop, not scrollBottom, so account for apertureHeight
      var newScrollTop = scrollableDomEl.scrollHeight - this.props.containerHeight;

      // this fires onScroll event, which will set the state.
      scrollableDomEl.scrollTop = newScrollTop;
    }

    this.writeDiagnostics();
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  componentWillUnmount () {
    window.cancelAnimationFrame(this.rafRequestId);
  },

  componentDidUpdate (prevProps, prevState) {
    //console.assert(this.viewState.measuredChildrenHeight >= this.prevViewState.measuredChildrenHeight
    //    || this.prevViewState.measuredChildrenHeight === undefined);

    // Measure item node heights again because they may have changed.
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item:not(.infinite-load-spinner)');
    var updatedHeights = measureChildHeights(domItems);
    if (this.props.flipped) {
      updatedHeights.reverse();
    }

    // in-place replacement of accumulated heights at this range with new measurements
    if (!_isEqual(this.measuredHeights.slice(this.state.computedView.visibleStart), updatedHeights)) {
      spliceArraySegmentAt(this.measuredHeights, this.state.computedView.visibleStart, updatedHeights);
      this.measuredDistances = this.measuredHeights.length > 0
          ? reductions(this.measuredHeights, (acc, val) => { return acc+val; })
          : [];
    }

    // should we track the actual scrollHeight to see how accurate we are?
    // this.refs.scrollable.getDOMNode().scrollHeight;

    //var loadedMoreChildren = this.viewState.numChildren !== this.prevViewState.numChildren;
    //if (loadedMoreChildren && this.props.flipped) {
    //
    //}

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



function measureChildHeights (domItems) {
  // clientHeight doesn't account for the border.
  // offsetHeight does, but it double counts some things.
  // It doesn't really matter - a few pixels isn't a big deal for this component.
  var xs = [];
  for (var i=0; i<domItems.length; ++i) {
    //var elHeight = domItems[i].clientHeight;
    var elHeight = domItems[i].getClientRects()[0].height;
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


function verifyVisibleRangeMonotonicallyIncreasing (flipped, scrollTop, nextScrollTop, viewState, nextViewState) {
  var isViewStateSettled = viewState !== null;
  // These diagnostics only hold true after things settle down in flipped mode.
  if (isViewStateSettled) {
    // scrollTop increased = scrolling absolute down
    var scrollingDown = nextScrollTop <= scrollTop;
    var scrollingUp = nextScrollTop >= scrollTop;

    var regular = !flipped;

    // regular: scrolling absolute down = forwards, up = backwards
    // flipped: scrolling absolute down = backwards, up = forwards

    var scrollingForwards = xor(regular, scrollingDown);
    var scrollingBackwards = xor(regular, scrollingUp);

    var scrollingForwards2 = xor(flipped, scrollingUp);
    var scrollingBackwards2 = xor(flipped, scrollingDown);

    console.assert(scrollingForwards == scrollingForwards2);
    console.assert(scrollingBackwards == scrollingBackwards2);

    // if scrolling forwards, visibleRange increased or stayed the same.
    // if scrolling backwards, visibleRange decreased or stayed the same.

    // visibleEnd can't be asserted because the algorithm might not put a consistent number of nodes in the dom.
    // maybe this is the problem?
    if (scrollingForwards) {
      console.assert(nextViewState.visibleStart >= viewState.visibleStart);
      //console.assert(nextViewState.visibleEnd >= viewState.visibleEnd);
    }

    if (scrollingBackwards) {
      console.assert(nextViewState.visibleStart <= viewState.visibleStart);
      //console.assert(nextViewState.visibleEnd <= viewState.visibleEnd);
    }
  }
}


module.exports = Infinite;
global.Infinite = Infinite;
