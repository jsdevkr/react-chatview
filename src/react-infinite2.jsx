var React = global.React || require('react');
var _isArray = require('lodash.isarray');
var _isFinite = require('lodash.isfinite');
var _clone = require('lodash.clone');
var _takeWhile = require('lodash.takewhile');
var _sum = require('lodash.sum');


var Infinite = React.createClass({

  propTypes: {

    maxChildren: React.PropTypes.number.isRequired, // max # visible items (e.g. # of blank items that fit)
    containerHeight: React.PropTypes.number.isRequired, // total height of the visible window.
    reverse: React.PropTypes.bool,
    handleScroll: React.PropTypes.func, // What is this for? Not used in examples.
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,
    infiniteLoadBeginBottomOffset: React.PropTypes.number,
    preloadAdditionalHeight: React.PropTypes.number,

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
    // Stored out-of-band of react state because the view doesn't depend on this, only scroll handlers,
    // we don't want to trigger component updates when we compute it.

    return {
      displayIndexStart: 0,
      // don't need displayIndexEnd
      scrollTimeout: undefined,
      isScrolling: false
    };
  },

  render () {
    var displayIndexEnd = this.state.displayIndexStart + this.props.maxChildren*2;

    var children = this.props.reverse ? _clone(this.props.children).reverse() : this.props.children;
    var displayables = children.slice(this.state.displayIndexStart, displayIndexEnd + 1);

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;



    // The top spacer is exactly the height of the list items that ought to be in the dom, but
    // are not visible thus removed.
    var distances = reductions(this.measuredHeights, (acc, val) => { return acc+val; }, 0);
    var topSpacerHeight = distances[this.state.displayIndexStart];

    // How accurate does this need to be? Can we guess at it and touch up later?
    // We don't have an exact displayIndexEnd, or totalHeight.
    // This determines how far down we can scroll past the elements that are in dom now.
    // 0px means we can't scroll past what's in the dom.
    var totalHeight = 2500;
    var bottomSpacerHeight = totalHeight - distances[displayIndexEnd];


    return (
      <div className={this.props.className} ref="scrollable" onScroll={this.onScroll}
           style={buildScrollableStyle(this.props.containerHeight)}>
        <div ref="smoothScrollingWrapper" style={this.state.isScrolling ? { pointerEvents: 'none' } : {}}>
          {this.props.reverse ? loadSpinner : null}
          <div ref="topSpacer" style={buildHeightStyle(topSpacerHeight)}/>
          {displayables}
          <div ref="bottomSpacer" style={buildHeightStyle(bottomSpacerHeight)}/>
          {this.props.reverse ? null : loadSpinner}
        </div>
      </div>
    );
  },

  onScroll (e) {
    // Order of effects here is unchanged from react-infinite, don't yet understand them

    var scrollTop = e.target.scrollTop;
    if (e.target !== this.refs.scrollable.getDOMNode()) { return; } // can this be an assert
    this.props.handleScroll(this.refs.scrollable.getDOMNode());

    this.manageScrollTimeouts();

    console.assert(!this.props.reverse, 'reverse unimplemented');
    var viewTop = Math.max(0, scrollTop - this.preloadAdditionalHeight());


    // sum the heights until heights >= viewTop
    // number of heights is displayIndexStart
    var distances = reductions(this.measuredHeights, (acc, val) => { return acc+val; }, 0);
    var displayIndexStart = _takeWhile(distances, (d) => { return d < viewTop; }).length;

    this.setState({ displayIndexStart: displayIndexStart });


    return;
    // have we reached scrollLimit to trigger load?
    // - If we don’t know all the heights, no we haven’t.
    // - If we do know all the heights, we know totalScrollableHeight

    // Have we measured all the children's height?
    // If we haven't seen all the nodes, we aren't ready to trigger a load. -- this is wrongish

    var allHeightsKnown = React.Children.count(this.props.children) === this.measuredHeights.length;
    if (!allHeightsKnown) {
      // not at the end - don't trigger load
    }
    else {
      var totalScrollableHeight = _sum(this.measuredHeights);
      var triggerLoad = (scrollTop >
          totalScrollableHeight -
          this.props.containerHeight -
          this.props.infiniteLoadBeginBottomOffset);
      if (triggerLoad && !this.state.isInfiniteLoading) {
        this.setState({ isInfiniteLoading: true });
        this.props.onInfiniteLoad();
      }
    }
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

  componentWillReceiveProps () {
    // New children, so recompute our state.
    this.setState({
      displayIndexStart: this.state.displayIndexStart
    })
  },

  componentDidMount () {
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item');

    // Measure the heights of the item DOM nodes as rendered and laid out.
    // We have not measured their heights yet.

    // Do not store this in React state, because the view doesn't depend on them
    // and we don't want to cause a re-render.
    this.measuredHeights = measureChildHeights(domItems);
  },

  componentDidUpdate () {
    var domItems = this.getDOMNode().querySelectorAll('.infinite-list-item');

    // Measure item node heights again because they may have changed.
    var updatedHeights = measureChildHeights(domItems);

    // in-place replacement of accumulated heights at this range with new measurements
    spliceArraySegmentAt(this.measuredHeights, this.state.displayIndexStart, updatedHeights);
  },

  preloadAdditionalHeight () {
    return typeof this.props.preloadAdditionalHeight === 'number' ?
        this.props.preloadAdditionalHeight :
        this.props.containerHeight;
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
