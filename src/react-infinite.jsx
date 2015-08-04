var React = global.React || require('react'),
    _isArray = require('lodash.isarray'),
    _isFinite = require('lodash.isfinite'),
    _clone = require('lodash.clone'),
    ConstantInfiniteComputer = require('./computers/constant_infinite_computer.js'),
    ArrayInfiniteComputer = require('./computers/array_infinite_computer.js');

var Infinite = React.createClass({

  propTypes: {
    handleScroll: React.PropTypes.func,

    // preloadBatchSize causes updates only to
    // happen each preloadBatchSize pixels of scrolling.
    // Set a larger number to cause fewer updates to the
    // element list.
    preloadBatchSize: React.PropTypes.number,
    // preloadAdditionalHeight determines how much of the
    // list above and below the container is preloaded even
    // when it is not currently visible to the user. In the
    // regular scroll implementation, preloadAdditionalHeight
    // is equal to the entire height of the list.
    preloadAdditionalHeight: React.PropTypes.number, // page to screen ratio

    // The provided elementHeight can be either
    //  1. a constant: all elements are the same height
    //  2. an array containing the height of each element
    elementHeight: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.arrayOf(React.PropTypes.number)
    ]).isRequired,
    // This is the total height of the visible window.
    containerHeight: React.PropTypes.number.isRequired,
    reverse: React.PropTypes.bool,

    infiniteLoadBeginBottomOffset: React.PropTypes.number,
    onInfiniteLoad: React.PropTypes.func,
    loadingSpinnerDelegate: React.PropTypes.node,

    isInfiniteLoading: React.PropTypes.bool,
    timeScrollStateLastsForAfterUserScrolls: React.PropTypes.number,

    className: React.PropTypes.string
  },

  getDefaultProps() {
    return {
      handleScroll: () => {},
      loadingSpinnerDelegate: <div/>,
      onInfiniteLoad: () => {},
      isInfiniteLoading: false,
      timeScrollStateLastsForAfterUserScrolls: 150,
      reverse: false
    };
  },

  // automatic adjust to scroll direction
  // give spinner a ReactCSSTransitionGroup
  getInitialState() {
    var computer = this.createInfiniteComputer(this.props.elementHeight, this.props.children);

    var preloadBatchSize = this.getPreloadBatchSizeFromProps(this.props);
    var preloadAdditionalHeight = this.getPreloadAdditionalHeightFromProps(this.props);

    return {
      infiniteComputer: computer,

      numberOfChildren: React.Children.count(this.props.children),
      displayIndexStart: 0,
      displayIndexEnd: computer.getDisplayIndexEnd(
                        preloadBatchSize + preloadAdditionalHeight
                      ),

      isInfiniteLoading: false,

      preloadBatchSize: preloadBatchSize,
      preloadAdditionalHeight: preloadAdditionalHeight,

      scrollTimeout: undefined,
      isScrolling: false
    };
  },

  createInfiniteComputer(data, children) {
    var computer;
    var numberOfChildren = React.Children.count(children);

    if (_isFinite(data)) {
      computer = new ConstantInfiniteComputer(data, numberOfChildren);
    } else if (_isArray(data)) {
      computer = new ArrayInfiniteComputer(data, numberOfChildren);
    } else {
      throw new Error("You must provide either a number or an array of numbers as the elementHeight prop.");
    }

    return computer;
  },

  componentWillReceiveProps(nextProps) {
    var that = this,
        newStateObject = {};

    // TODO: more efficient elementHeight change detection
    newStateObject.infiniteComputer = this.createInfiniteComputer(
                                        nextProps.elementHeight,
                                        nextProps.children
                                      );

    if (nextProps.isInfiniteLoading !== undefined) {
      newStateObject.isInfiniteLoading = nextProps.isInfiniteLoading;
    }

    newStateObject.preloadBatchSize = this.getPreloadBatchSizeFromProps(nextProps);
    newStateObject.preloadAdditionalHeight = this.getPreloadAdditionalHeightFromProps(nextProps);

    this.setState(newStateObject, () => {
      that.setStateFromScrollTop(that.getScrollTop());
    });
  },

  getPreloadBatchSizeFromProps(props) {
    return typeof props.preloadBatchSize === 'number' ?
      props.preloadBatchSize :
      props.containerHeight / 2;
  },

  getPreloadAdditionalHeightFromProps(props) {
    return typeof props.preloadAdditionalHeight === 'number' ?
      props.preloadAdditionalHeight :
      props.containerHeight;
  },

  //componentWillUpdate(nextProps, nextState) {
  //  var prevScrollHeight = this.state.infiniteComputer.getTotalScrollableHeight();
  //  var newScrollHeight = nextState.infiniteComputer.getTotalScrollableHeight();
  //  var deltaHeight = newScrollHeight - prevScrollHeight;
  //
  //  if (deltaHeight !== 0) {
  //    var domScroll = this.refs.scrollable.getDOMNode();
  //    if (nextProps.reverse) {
  //      var loadingSpinnerHeight = this.refs.loadingSpinner.getDOMNode().clientHeight;
  //      //domScroll.scrollTop = domScroll.scrollTop + deltaHeight - loadingSpinnerHeight;
  //    }
  //    //this.setStateFromScrollTop(domScroll.scrollTop);
  //  }
  //},

  componentDidUpdate(prevProps, prevState) {
    var prevScrollHeight = prevState.infiniteComputer.getTotalScrollableHeight();
    var newScrollHeight = this.state.infiniteComputer.getTotalScrollableHeight();
    var deltaHeight = newScrollHeight - prevScrollHeight;

    if (deltaHeight !== 0) {
      var domScroll = this.refs.scrollable.getDOMNode();
      if (this.props.reverse) {
        var loadingSpinnerHeight = 0; //11; this.refs.loadingSpinner.getDOMNode().clientHeight;
        domScroll.scrollTop = domScroll.scrollTop + deltaHeight - loadingSpinnerHeight;
      }
      this.setStateFromScrollTop(this.getScrollTop());
    }
  },

  componentWillMount() {
    if (_isArray(this.props.elementHeight)) {
      if (React.Children.count(this.props.children) !== this.props.elementHeight.length) {
        throw new Error("There must be as many values provided in the elementHeight prop as there are children.")
      }
    }
  },

  componentDidMount () {
    if (this.props.reverse) {
      this.refs.scrollable.getDOMNode().scrollTop = this.refs.scrollable.getDOMNode().scrollHeight;
    }
  },

  getScrollTop() {
    return this.refs.scrollable.getDOMNode().scrollTop;
  },

  // Given the scrollTop of the container, computes the state the
  // component should be in. The goal is to abstract all of this
  // from any actual representation in the DOM.
  // The window is the block with any preloadAdditionalHeight
  // added to it.
  setStateFromScrollTop(scrollTop) {
    var blockNumber = this.state.preloadBatchSize === 0 ? 0 : Math.floor(scrollTop / this.state.preloadBatchSize),
        blockStart = this.state.preloadBatchSize * blockNumber,
        blockEnd = blockStart + this.state.preloadBatchSize,
        windowTop = Math.max(0, blockStart - this.state.preloadAdditionalHeight), // ?
        windowBottom = Math.min(this.state.infiniteComputer.getTotalScrollableHeight(),
                        blockEnd + this.state.preloadAdditionalHeight), // ?
        displayIndexStart = this.state.infiniteComputer.getDisplayIndexStart(windowTop),
        displayIndexEnd = this.state.infiniteComputer.getDisplayIndexEnd(windowBottom);

    this.setState({
      displayIndexStart: displayIndexStart,
      displayIndexEnd: displayIndexEnd
    });
  },

  infiniteHandleScroll(e) {
    if (e.target !== this.refs.scrollable.getDOMNode()) {
      return;
    }

    this.props.handleScroll(this.refs.scrollable.getDOMNode());
    this.handleScroll(e.target.scrollTop);
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

  handleScroll(scrollTop) {
    this.manageScrollTimeouts();
    this.setStateFromScrollTop(scrollTop);

    var infiniteScrollLimit;
    if (this.props.reverse) {
      infiniteScrollLimit = scrollTop < this.props.infiniteLoadBeginBottomOffset;
    }
    else {
      infiniteScrollLimit = scrollTop >
          (this.state.infiniteComputer.getTotalScrollableHeight() -
          this.props.containerHeight -
          this.props.infiniteLoadBeginBottomOffset);
    }

    if (infiniteScrollLimit && !this.state.isInfiniteLoading) { // change this condition
      this.setState({
        isInfiniteLoading: true
      });
      this.props.onInfiniteLoad();
      // in reverse mode, after the infinite load, fix up the scroll, because the new
      // children just pushed down the child we were just looking at
    }
  },

  // Helpers for React styles.
  buildScrollableStyle() {
    return {
      height: this.props.containerHeight,
      overflowX: 'hidden',
      overflowY: 'scroll'
    };
  },

  buildHeightStyle(height) {
    return {
      width: '100%',
      height: Math.ceil(height) + 'px'
    };
  },

  render() {
    var children = this.props.reverse ? _clone(this.props.children).reverse() : this.props.children;
    var displayables = children.slice(this.state.displayIndexStart, this.state.displayIndexEnd + 1);

    var infiniteScrollStyles = {};
    if (this.state.isScrolling) {
      infiniteScrollStyles.pointerEvents = 'none';
    }

    var topSpacerHeight = this.state.infiniteComputer.getTopSpacerHeight(this.state.displayIndexStart),
        bottomSpacerHeight = this.state.infiniteComputer.getBottomSpacerHeight(this.state.displayIndexEnd);

    //if (this.props.reverse) {
    //  topSpacerHeight = topSpacerHeight + this.props.infiniteLoadBeginBottomOffset;
    //  bottomSpacerHeight = bottomSpacerHeight + this.props.infiniteLoadBeginBottomOffset;
    //}

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    // topSpacer and bottomSpacer take up the amount of space that the
    // rendered elements would have taken up otherwise
    return <div className={this.props.className ? this.props.className : ''}
                ref="scrollable"
                style={this.buildScrollableStyle()}
                onScroll={this.infiniteHandleScroll}>
      <div ref="smoothScrollingWrapper" style={infiniteScrollStyles}>
        {this.props.reverse ? loadSpinner : null}
        <div ref="topSpacer"
             style={this.buildHeightStyle(topSpacerHeight)}/>
            {displayables}
        <div ref="bottomSpacer"
             style={this.buildHeightStyle(bottomSpacerHeight)}/>
        {this.props.reverse ? null : loadSpinner}
      </div>
    </div>;
  }
});

module.exports = Infinite;
global.Infinite = Infinite;
