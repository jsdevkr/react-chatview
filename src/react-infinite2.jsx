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

    className: React.PropTypes.string
  },

  getDefaultProps () {
    return {
      reverse: false,
      loadingSpinnerDelegate: <div/>,
      handleScroll: () => {},
      className: ''
    };
  },

  getInitialState () {
    return {
      displayIndexStart: 0
      // don't need displayIndexEnd
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
    if (e.target !== this.refs.scrollable.getDOMNode()) { return; } // can this be an assert

    this.props.handleScroll(this.refs.scrollable.getDOMNode());
    //this.handleScroll(e.target.scrollTop);
  },

  componentWillReceiveProps () {
    // New children, so recompute our state.
    this.setState({
      displayIndexStart: this.state.displayIndexStart
    })
  },

  componentDidUpdate () {

  }
});



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
