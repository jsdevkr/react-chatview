var React = global.React || require('react');
var _clone = require('lodash.clone');
var ViewState = require('./ViewState');


var Infinite = React.createClass({

  propTypes: {

    maxChildren: React.PropTypes.number.isRequired, // max # visible items (e.g. # of blank items that fit)
    containerHeight: React.PropTypes.number.isRequired, // total height of the visible window.
    reverse: React.PropTypes.bool,
    handleScroll: React.PropTypes.func, // What is this for? Not used in examples.
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,
    infiniteLoadBeginBottomOffset: React.PropTypes.number,
    onInfiniteLoad: React.PropTypes.func,

    className: React.PropTypes.string
  },

  getDefaultProps () {
    return {
      reverse: false,
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
      scrollTimeout: undefined,
      isScrolling: false
    };
  },


  render () {

    var viewState = ViewState.computeViewState(
        this.props.containerHeight,
        this.measuredDistances,
        this.state.scrollTop,
        React.Children.count(this.props.children),
        this.props.maxChildren);

    var children = this.props.reverse ? _clone(this.props.children).reverse() : this.props.children;
    var displayables = children.slice(viewState.visibleStart, viewState.visibleEnd + 1);

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    var topSpace = !this.props.reverse ? viewState.frontSpace : viewState.backSpace;
    var bottomSpace = !this.props.reverse ? viewState.backSpace : viewState.frontSpace;

    return (
      <div className={this.props.className} ref="scrollable" onScroll={this.onScroll}
           style={buildScrollableStyle(viewState.apertureHeight)}>
        <div ref="smoothScrollingWrapper" style={this.state.isScrolling ? { pointerEvents: 'none' } : {}}>
          {this.props.reverse ? loadSpinner : null}
          <div ref="topSpacer" style={buildHeightStyle(topSpace)}/>
          {displayables}
          <div ref="bottomSpacer" style={buildHeightStyle(bottomSpace)}/>
          {this.props.reverse ? null : loadSpinner}
        </div>
      </div>
    );
  },

  onScroll (e) {
    // Order of effects here is unchanged from react-infinite, don't yet understand them

    var scrollTop = e.target.scrollTop;
    if (e.target !== this.refs.scrollable.getDOMNode()) { return; } // can this be an assert
    this.props.handleScroll(this.refs.scrollable.getDOMNode()); // react-infinite exposed this prop, but what value does it have?

    this.manageScrollTimeouts();

    this.setState({ scrollTop: scrollTop });

    //if (this.shouldTriggerLoad(scrollTop)) {
    //  this.setState({ isInfiniteLoading: true });
    //  this.props.onInfiniteLoad();
    //}

  },

  shouldTriggerLoad (scrollTop) {
    var allHeightsKnown = React.Children.count(this.props.children) === this.measuredHeights.length;
    if (!allHeightsKnown) {
      return false; // If we haven't seen all the nodes, we aren't ready to trigger a load. -- this is wrongish
    }

    var totalScrollableHeight = this.measuredDistances[this.measuredDistances.length-1];
    var whatIsThisNumber = totalScrollableHeight - this.props.containerHeight - this.props.infiniteLoadBeginBottomOffset;
    var triggerLoad = (scrollTop > whatIsThisNumber);

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
            scrollTimeout: undefined
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
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item');

    // Measure the heights of the item DOM nodes as rendered and laid out.
    // We have not measured their heights yet.

    // Do not store this in React state, because the view doesn't depend on them
    // and we don't want to cause a re-render.
    this.measuredHeights = measureChildHeights(domItems);
    this.measuredDistances = reductions(this.measuredHeights, (acc, val) => { return acc+val; }, 0);
  },

  componentDidUpdate () {
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item');

    // Measure item node heights again because they may have changed.
    var updatedHeights = measureChildHeights(domItems);

    // in-place replacement of accumulated heights at this range with new measurements
    spliceArraySegmentAt(this.measuredHeights, this.state.displayIndexStart, updatedHeights);
    this.measuredDistances = reductions(this.measuredHeights, (acc, val) => { return acc+val; }, 0);
  }
});



function reductions (coll, iteratee, seed) {
  var steps = [];
  var sum = coll.reduce((acc, val, i) => {
    steps.push(acc);
    var acc = iteratee(acc, val, i);
    return acc;
  }, seed);
  steps.push(sum);
  return steps;
}


function spliceArraySegmentAt(arrayRef, start, newArray) {
  var splice_args = [start, newArray.length].concat(newArray);
  var MAX_NUM_FN_ARGS = 32766;
  console.assert(splice_args.length < MAX_NUM_FN_ARGS, 'http://stackoverflow.com/questions/22747068/');
  Array.prototype.splice.apply(arrayRef, splice_args);
}


function measureChildHeights (domItems) {
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


function buildScrollableStyle(containerHeight) {
  return {
    height: containerHeight,
    overflowX: 'hidden',
    overflowY: 'scroll'
  };
}



module.exports = Infinite;
global.Infinite = Infinite;
