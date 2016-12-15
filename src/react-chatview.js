import React from 'react';
import ReactDOM from 'react-dom';
import clone from 'lodash.clone';

var ChatView = React.createClass({

  propTypes: {
    flipped: React.PropTypes.bool,
    scrollLoadThreshold: React.PropTypes.number,
    onInfiniteLoad: React.PropTypes.func.isRequired,
    loadingSpinnerDelegate: React.PropTypes.element,
    className: React.PropTypes.string,
    enableAutoScroll: React.PropTypes.bool,
  },

  getDefaultProps () {
    return {
      flipped: false,
      scrollLoadThreshold: 10,
      loadingSpinnerDelegate: <div/>,
      className: '',
      enableAutoScroll: true,
    };
  },

  getInitialState () {
    this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount
    this.scrollTop = 0; // regular mode initial scroll
    this.scrollHeight = undefined; // it's okay, this won't be read until the second render.
    // In flipped mode, we need to measure the scrollable height from the DOM to write to the scrollTop.
    // Flipped and regular measured heights are symmetrical and don't depend on the scrollTop

    return {
      isInfiniteLoading: false
    };
  },

  componentWillUpdate (nextProps, nextState) {},

  render () {
    var displayables = clone(this.props.children);

    var loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    // Must not hook onScroll event directly - that will break hardware accelerated scrolling.
    // We poll it with requestAnimationFrame instead.
    return (
      <div className={this.props.className} ref="scrollable"
           style={{overflowX: 'hidden', overflowY: 'scroll'}}>
        <div ref="smoothScrollingWrapper">
          {this.props.flipped ? loadSpinner : null}
          {displayables}
          {this.props.flipped ? null : loadSpinner}
        </div>
      </div>
    );
  },

  // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
  // may have changed.
  pollScroll () {
    var domNode = ReactDOM.findDOMNode(this);
    if (domNode.scrollTop !== this.scrollTop) {
      if (this.shouldTriggerLoad(domNode)) {
        this.setState({ isInfiniteLoading: true });
        var p = this.props.onInfiniteLoad();
        p.then(() => this.setState({ isInfiniteLoading: false }));
      }
      // the dom is ahead of the state
      this.updateScrollTop(domNode.scrollHeight !== this.scrollHeight);
    } else if (domNode.scrollHeight !== this.scrollHeight) {
      this.updateScrollTop();
    }
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  isPassedThreshold (flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
    return flipped
        ? scrollTop <= scrollLoadThreshold
        : scrollTop >= (scrollHeight - clientHeight - scrollLoadThreshold);
  },

  shouldTriggerLoad (domNode) {
    var passedThreshold = this.isPassedThreshold(
        this.props.flipped,
        this.props.scrollLoadThreshold,
        domNode.scrollTop,
        domNode.scrollHeight,
        domNode.clientHeight);
    return passedThreshold && !this.state.isInfiniteLoading;
  },

  componentDidMount () {
    var scrollableDomEl = ReactDOM.findDOMNode(this);

    // If there are not yet any children (they are still loading),
    // this is a no-op as we are at both the top and bottom of empty viewport
    var heightDifference = this.props.flipped
        ? scrollableDomEl.scrollHeight - scrollableDomEl.clientHeight
        : 0;

    scrollableDomEl.scrollTop = heightDifference;
    if (this.props.enableAutoScroll) {
      this.scrollTop = heightDifference;
    }
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  },

  componentWillUnmount () {
    window.cancelAnimationFrame(this.rafRequestId);
  },

  componentDidUpdate (prevProps, prevState) {
    this.updateScrollTop();
  },

  updateScrollTop() {
    if (this.props.enableAutoScroll) {
      var scrollableDomEl = ReactDOM.findDOMNode(this);

      //todo this is only the happy path
      var newScrollTop = scrollableDomEl.scrollTop + (this.props.flipped
          ? scrollableDomEl.scrollHeight - (this.scrollHeight || 0)
          : 0);

      if (newScrollTop !== scrollableDomEl.scrollTop) {
        scrollableDomEl.scrollTop = newScrollTop;
      }

      this.scrollTop = scrollableDomEl.scrollTop;
      this.scrollHeight = scrollableDomEl.scrollHeight;
    }

    // Setting scrollTop can halt user scrolling (and disables hardware acceleration)

    // Both cases - flipped and refular - have cases where the content expands in the proper direction,
    // or the content expands in the wrong direciton. Either history or new message in both cases.
    // We are only handling half of the cases. Or an image resized above or below us.
  }
});


module.exports = ChatView;
