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
    this.viewState = null;
    this.prevViewState = null;
    // Stored out-of-band of react state because the view doesn't depend on this, only scroll handlers,
    // we don't want to trigger component updates when we compute it.

    return {
      scrollTop: 0,
      scrollTimeout: null,
      isScrolling: false,
      isInfiniteLoading: false
    };
  },

  componentWillMount () {
    // Flipped mode is weird on first render, because it depends on knowing the scrollableHeight.
    // If we don't have it, we have to render regularly for just one frame, to measure it.
    // Forward and flipped rendering are symmetrical wrt measuring the children so the
    // measurement is accurate.
    // It's okay - we can't set the scrollbar pos to the bottom until after first render also.
    // After first render, we set the scrollbar pos, which triggers a new render, which will
    // properly render flipped.

    var flipped = this.props.flipped;
    var isFirstRender = this.prevViewState === null;
    if (flipped && isFirstRender) {
      flipped = false;
    }

    // calculated viewState is needed in render, lifecycle methods and events.
    this.prevViewState = null;
    this.viewState = ViewState.computeViewState(
        this.state.scrollTop, // scrollTop is always the height of aperatureTop, measured from the scrollable bottom.
        this.props.containerHeight,
        this.measuredDistances,
        this.prevViewState !== null ? this.prevViewState.measuredScrollableHeight : null,
        React.Children.count(this.props.children),
        this.props.maxChildren,
        flipped);
  },

  componentWillUpdate (nextProps, nextState) {
    // viewState is a function of state.scrollTop only - it is not a function of the other
    // state keys: isScrolling, isInfiniteLoading, scrollTimeout.
    // Do not recompute viewstate when these other state keys change. This matters a lot because
    // in flipped mode, the viewState depends on prevViewState.

    if (this.state.scrollTop !== nextState.scrollTop) {
      var nextViewState = ViewState.computeViewState(
          nextState.scrollTop,
          this.props.containerHeight,
          this.measuredDistances,
          this.viewState.measuredScrollableHeight,
          React.Children.count(this.props.children),
          this.props.maxChildren,
          this.props.flipped);


      var isViewStateSettled = this.prevViewState !== null;
      // These diagnostics only hold true after things settle down in flipped mode.
      if (isViewStateSettled) {
        // scrollTop increased = scrolling absolute down
        var scrollingDown = nextState.scrollTop <= this.state.scrollTop;
        var scrollingUp = nextState.scrollTop >= this.state.scrollTop;

        var regular = !this.props.flipped;
        var flipped = this.props.flipped;

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
        if (scrollingForwards) {
          console.assert(nextViewState.visibleStart >= this.viewState.visibleStart);
          console.assert(nextViewState.visibleEnd >= this.viewState.visibleEnd);
        }

        if (scrollingBackwards) {
          console.assert(nextViewState.visibleStart <= this.viewState.visibleStart);
          console.assert(nextViewState.visibleEnd <= this.viewState.visibleEnd);
        }
      }

      // Setup viewStates for render as if they were managed by react lifecycle.
      this.prevViewState = this.viewState;
      this.viewState = nextViewState;
    }
  },


  render () {
    var displayables = this.props.children.slice(this.viewState.visibleStart, this.viewState.visibleEnd);
    if (this.props.flipped) {
      displayables.reverse();
    }

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    var topSpace = !this.props.flipped ? this.viewState.frontSpace : this.viewState.backSpace;
    var bottomSpace = !this.props.flipped ? this.viewState.backSpace : this.viewState.frontSpace;

    return (
      <div className={this.props.className} ref="scrollable" onScroll={this.onScroll}
           style={buildScrollableStyle(this.viewState.apertureHeight)}>
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

  onScroll (e) {
    console.assert(e.target === this.refs.scrollable.getDOMNode());

    this.manageScrollTimeouts();

    var scrollTop = e.target.scrollTop;
    if (this.shouldTriggerLoad(scrollTop)) {
      this.setState({ isInfiniteLoading: true, scrollTop: scrollTop });
      this.props.onInfiniteLoad();
    }
    else {
      this.setState({ scrollTop: scrollTop });
    }
  },

  shouldTriggerLoad (scrollTop) {
    var viewState = this.viewState;

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
    this.measuredDistances = reductions(this.measuredHeights, (acc, val) => { return acc+val; });

    if (this.props.flipped) {
      // Set scrollbar position to all the way at bottom.
      var scrollableDomEl = this.refs.scrollable.getDOMNode();

      // API is scrollTop, not scrollBottom, so account for apertureHeight
      var newScrollTop = scrollableDomEl.scrollHeight - this.props.containerHeight;

      // this fires onScroll event, which will set the state.
      scrollableDomEl.scrollTop = newScrollTop;
    }

    this.writeDiagnostics();
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
    if (!_isEqual(this.measuredHeights.slice(this.viewState.visibleStart), updatedHeights)) {
      spliceArraySegmentAt(this.measuredHeights, this.viewState.visibleStart, updatedHeights);
      this.measuredDistances = reductions(this.measuredHeights, (acc, val) => { return acc+val; });
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
      var diagnostics = {
        reactState: this.state,
        viewState: this.viewState
      };
      var diagnosticsString = JSON.stringify(diagnostics, undefined, 2);
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
    xs.push(domItems[i].clientHeight);
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
