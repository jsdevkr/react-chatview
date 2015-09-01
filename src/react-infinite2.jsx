var React = global.React || require('react');
var _cloneDeep = require('lodash.clonedeep');
var _clone = require('lodash.clone');
var _isEqual = require('lodash.isequal');
var _last = require('lodash.last');
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
    this.measuredLoadSpinner = 0; // if we have a load spinner, this is the last measured height
    // Stored out-of-band of react state because we don't want to trigger component updates when
    // we measure it in a lifecycle method. They are duplicated into react state (part of the viewState)
    // but that is just to provide consistent access to past values of the system.
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
        this.measuredLoadSpinner,
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
        this.props.onInfiniteLoad();
        this.setState({ isInfiniteLoading: true });
      }
      // DO NOT effect domEl.scrollTop. Do this when the new children hit dom in didUpdate
    }
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  setViewState (props, scrollTop) {
    // Can't inspect props directly, sometimes we're dealing with a future view state from
    // componentWillReceiveNewProps. That method can't setState, so we can safely inspect this.state.
    var nextViewState = ViewState.computeViewState(
        scrollTop,
        props.containerHeight,
        this.measuredDistances,
        this.measuredLoadSpinner,
        this.state.computedView.measuredChildrenHeight,
        React.Children.count(props.children),
        props.maxChildren,
        props.flipped);

    this.setState({computedView: nextViewState, isFirstRender: false});
    return nextViewState;
  },

  shouldTriggerLoad (scrollTop, viewState) {
    var new_apertureTop = scrollTop;
    var new_visibleEnd_DistanceFromFront = !this.props.flipped
        ? new_apertureTop
        : viewState.measuredChildrenHeight - new_apertureTop;

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
    var isInfiniteLoading = nextProps.isInfiniteLoading !== undefined
        ? nextProps.isInfiniteLoading
        : this.state.isInfiniteLoading;

    if (React.Children.count(this.props.children) !== React.Children.count(nextProps.children)) {
      // https://github.com/facebook/react/issues/2659
      this.setViewState(nextProps, this.getDOMNode().scrollTop);
      // The new children are about to be rendered. We haven't measured them yet. Somehow we need to adjust the
      // scrollTop to account for any new children that loaded above us. Render them now without adjusting scrollTop.
      // Then, browser will reflow, then we can measure the scrollTop in didUpdate and fix it up,
      // this happens before repaint.  https://github.com/facebook/react/issues/2659
    }

    this.setState({
      isInfiniteLoading: isInfiniteLoading
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

    this.measuredHeights = updatedHeights;
    this.measuredDistances = this.measuredHeights.length > 0
        ? reductions(this.measuredHeights, (acc, val) => { return acc+val; })
        : [];
    this.measuredLoadSpinner = measureDomHeight(this.refs.loadingSpinner.getDOMNode());

    var loadedMoreChildren = this.state.computedView.numChildren !== prevState.computedView.numChildren;
    // Will need to check the height difference, not the num children, TODO.
    // if flipped and the measuredHeight changed, adjust the scrollTop so user perceives no jump if items
    // are loaded above them in the DOM. This needs to happen in forwards mode too but the math will be different,
    // e.g. in the case of a new message came, or an image resized below us.

    if (loadedMoreChildren && this.props.flipped) {
      // We have just measured the heights right above! The viewState measuredChildrenHeights is one tick behind, i think.
      var exactChildrenHeight = _last(this.measuredDistances);
      var prevExactChildrenHeight = this.state.computedView.measuredChildrenHeight;
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
      var diagnostics = _cloneDeep(this.state);
      delete diagnostics.computedView.measuredDistances; // too large to display
      var diagnosticsString = JSON.stringify(diagnostics, undefined, 2);
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
