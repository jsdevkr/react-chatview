var React = global.React || require('react');
var _isArray = require('lodash.isarray');
var _isFinite = require('lodash.isfinite');
var _clone = require('lodash.clone');
var ConstantInfiniteComputer = require('./computers/constant_infinite_computer.js');
var ArrayInfiniteComputer = require('./computers/array_infinite_computer.js');


var Infinite = React.createClass({

  propTypes: {

    maxChildren: React.PropTypes.number.isRequired, // max # visible items (e.g. # of blank items that fit)
    containerHeight: React.PropTypes.number.isRequired, // total height of the visible window.
    reverse: React.PropTypes.bool,
    handleScroll: React.PropTypes.func, // What is this for? Not used in examples.
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,

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
    return {
      displayIndexStart: 0,
      // don't need displayIndexEnd
      scrollTimeout: undefined,
      isScrolling: false,

      measuredHeights: [] // actual heights of items measured from dom as we see them
    };
  },

  render () {
    var displayIndexEnd = this.state.displayIndexStart + this.props.maxChildren;

    var children = this.props.reverse ? _clone(this.props.children).reverse() : this.props.children;
    var displayables = children.slice(this.state.displayIndexStart, displayIndexEnd + 1);

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    var topSpacerHeight = undefined; //this.state.infiniteComputer.getTopSpacerHeight(this.state.displayIndexStart),
    var bottomSpacerHeight = undefined; //this.state.infiniteComputer.getBottomSpacerHeight(this.state.displayIndexEnd);


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
    var scrollTop = e.target.scrollTop;
    if (e.target !== this.refs.scrollable.getDOMNode()) { return; } // can this be an assert
    this.props.handleScroll(this.refs.scrollable.getDOMNode());
    //this.handleScroll(scrollTop);
  },

  handleScroll (scrollTop) {
    this.manageScrollTimeouts();
    this.setStateFromScrollTop(scrollTop);
    console.assert(!this.props.reverse, 'reverse unimplemented');

    // have we reached scrollLimit to trigger load?
    // - If we don’t know all the heights, no we haven’t.
    // - If we do know all the heights, we know totalScrollableHeight
    if (false) {

    }
    else {
      var triggerLoad = scrollTop >
          (this.state.infiniteComputer.getTotalScrollableHeight() -
          this.props.containerHeight -
          this.props.infiniteLoadBeginBottomOffset);
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
  }
});


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
