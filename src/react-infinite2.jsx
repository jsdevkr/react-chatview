var React = global.React || require('react');
var _clone = require('lodash.clone');
var spliceArraySegmentAt = require('./utils/splice_array_segment_at');
var reductions = require('./utils/reductions');
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
    // Stored out-of-band of react state because the view doesn't depend on this, only scroll handlers,
    // we don't want to trigger component updates when we compute it.

    return {
      scrollTop: 0,
      scrollTimeout: null,
      isScrolling: false
    };
  },

  render () {

    // Flipped mode is weird on first render, because it depends on knowing the scrollableHeight.
    // If we don't have it, we have to render regularly for just one frame, to measure it.
    // It's okay - we can't set the scrollbar pos to the bottom until after first render also.
    var flipped = this.props.flipped;
    var isFirstRender = this.prevMeasuredScrollableHeight === undefined;
    if (flipped && isFirstRender) {
      flipped = false;
    }

    this.prevViewState = this.viewState; // maybe helpful for diagnostics
    var viewState = ViewState.computeViewState( // move to willUpdate?
        this.state.scrollTop, // scrollTop is always the height of aperatureTop, measured from the scrollable bottom.
        this.props.containerHeight,
        this.measuredDistances,
        this.prevMeasuredScrollableHeight,
        React.Children.count(this.props.children),
        this.props.maxChildren,
        flipped);
    this.viewState = viewState; // calculated viewState is needed in events and lifecycle methods.

    var displayables = this.props.children.slice(viewState.visibleStart, viewState.visibleEnd);
    if (flipped) {
      displayables.reverse();
    }

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    var topSpace = !flipped ? viewState.frontSpace : viewState.backSpace;
    var bottomSpace = !flipped ? viewState.backSpace : viewState.frontSpace;

    return (
      <div className={this.props.className} ref="scrollable" onScroll={this.onScroll}
           style={buildScrollableStyle(viewState.apertureHeight)}>
        <div ref="smoothScrollingWrapper" style={this.state.isScrolling ? { pointerEvents: 'none' } : {}}>
          {flipped ? loadSpinner : null}
          <div ref="topSpacer" style={buildHeightStyle(topSpace)}/>
          {displayables}
          <div ref="bottomSpacer" style={buildHeightStyle(bottomSpace)}/>
          {flipped ? null : loadSpinner}
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
        : viewState.prevMeasuredScrollableHeight - new_apertureTop;

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
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item');
    this.measuredHeights = measureChildHeights(domItems);
    this.measuredDistances = reductions(this.measuredHeights, (acc, val) => { return acc+val; });

    // For flipped mode - need to know the scrollableHeight to compute the visible range.
    this.prevMeasuredScrollableHeight = this.refs.scrollable.getDOMNode().scrollHeight;

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
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item');
    var updatedHeights = measureChildHeights(domItems);

    // in-place replacement of accumulated heights at this range with new measurements
    spliceArraySegmentAt(this.measuredHeights, this.viewState.visibleStart, updatedHeights);
    this.measuredDistances = reductions(this.measuredHeights, (acc, val) => { return acc+val; });

    this.prevMeasuredScrollableHeight = this.refs.scrollable.getDOMNode().scrollHeight;

    var loadedMoreChildren = this.viewState.numChildren !== this.prevViewState.numChildren;
    if (loadedMoreChildren && this.props.flipped) {
      
    }

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
      domEl.textContent = diagnosticsString;
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
