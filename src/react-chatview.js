import React from 'react';
import ReactDOM from 'react-dom';
import clone from 'lodash.clone';
import PropTypes from 'prop-types';

let supportsPassive = false;

try {
  let opts = Object.defineProperty({}, 'passive', {
    get() {
      supportsPassive = true;
    },
  });
  window.addEventListener('test', null, opts);
} catch (e) { /* pass */
}

export default class ChatView extends React.Component {

  constructor(props) {
    super(props);

    this.rafRequestId = null; // for cleaning up outstanding requestAnimationFrames on WillUnmount
    this.scrollTop = 0; // regular mode initial scroll
    this.scrollHeight = undefined; // it's okay, this won't be read until the second render.
    // In flipped mode, we need to measure the scrollable height from the DOM to write to the scrollTop.
    // Flipped and regular measured heights are symmetrical and don't depend on the scrollTop

    this.state = {
      isInfiniteLoading: false
    };
  }

  componentWillUpdate(nextProps, nextState) {
  }

  render() {
    let displayables = clone(this.props.children);
    if (this.props.flipped) {
      displayables.reverse();
    }

    let loadSpinner = <div ref="loadingSpinner">
      {this.state.isInfiniteLoading ? this.props.loadingSpinnerDelegate : null}
    </div>;

    return (
        <div className={this.props.className} ref="scrollable"
             style={{ overflowX: 'hidden', overflowY: 'scroll' }}>
          <div ref="smoothScrollingWrapper">
            {this.props.flipped ? loadSpinner : null}
            {displayables}
            {this.props.flipped ? null : loadSpinner}
          </div>
        </div>
    );
  }

  // detect when dom has changed underneath us- either scrollTop or scrollHeight (layout reflow)
  // may have changed.
  onScroll() {
    let domNode = ReactDOM.findDOMNode(this);

    // if the containing component passed in an onscroll handler function as a property
    if (this.props.handleScroll) {
      this.props.handleScroll(domNode.scrollTop);
    }

    if (domNode.scrollTop !== this.scrollTop) {
      if (this.shouldTriggerLoad(domNode)) {
        this.setState({ isInfiniteLoading: true });
        let p = this.props.onInfiniteLoad();
        p.then(() => this.setState({ isInfiniteLoading: false }));
      }
      // the dom is ahead of the state
      this.updateScrollTop();
    }
  }

  pollScroll() {
    this.onScroll();
    this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
  }

  isPassedThreshold(flipped, scrollLoadThreshold, scrollTop, scrollHeight, clientHeight) {
    return flipped
        ? scrollTop <= scrollLoadThreshold
        : scrollTop >= (scrollHeight - clientHeight - scrollLoadThreshold);
  }

  shouldTriggerLoad(domNode) {
    let passedThreshold = this.isPassedThreshold(
        this.props.flipped,
        this.props.scrollLoadThreshold,
        domNode.scrollTop,
        domNode.scrollHeight,
        domNode.clientHeight);
    return passedThreshold && !this.state.isInfiniteLoading;
  }

  componentDidMount() {
    let scrollableDomEl = ReactDOM.findDOMNode(this);

    // If there are not yet any children (they are still loading),
    // this is a no-op as we are at both the top and bottom of empty viewport
    let heightDifference = this.props.flipped
        ? scrollableDomEl.scrollHeight - scrollableDomEl.clientHeight
        : 0;

    scrollableDomEl.scrollTop = heightDifference;
    this.scrollTop = heightDifference;

    // Unless passive events are supported, we must not hook onScroll event
    // directly - that will break hardware accelerated scrolling. We poll it
    // with requestAnimationFrame instead.
    if (supportsPassive) {
      scrollableDomEl.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
    } else {
      this.rafRequestId = window.requestAnimationFrame(this.pollScroll);
    }
  }

  componentWillUnmount() {
    let scrollableDomEl = ReactDOM.findDOMNode(this);
    scrollableDomEl.removeEventListener('scroll', this.onScroll.bind(this), { passive: true });
    window.cancelAnimationFrame(this.rafRequestId);
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateScrollTop();
  }

  updateScrollTop() {
    let scrollableDomEl = ReactDOM.findDOMNode(this);

    //todo this is only the happy path
    let newScrollTop = scrollableDomEl.scrollTop + (this.props.flipped
            ? scrollableDomEl.scrollHeight - (this.scrollHeight || 0)
            : 0);

    // if scrollHeightDifference is > 0 then something was removed from list
    let scrollHeightDifference = this.scrollHeight ? this.scrollHeight - scrollableDomEl.scrollHeight : 0;

    // if something was removed from list we need to include this difference in new scroll top
    if (this.props.flipped && scrollHeightDifference > 0) {
      newScrollTop += scrollHeightDifference;
    }

    if (newScrollTop !== scrollableDomEl.scrollTop) {
      scrollableDomEl.scrollTop = newScrollTop;
    }

    this.scrollTop = scrollableDomEl.scrollTop;
    this.scrollHeight = scrollableDomEl.scrollHeight;

    // Setting scrollTop can halt user scrolling (and disables hardware acceleration)

    // Both cases - flipped and regular - have cases where the content expands in the proper direction,
    // or the content expands in the wrong direction. Either history or new message in both cases.
    // We are only handling half of the cases. Or an image re-sized above or below us.
  }
}

ChatView.defaultProps = {
  flipped: false,
  scrollLoadThreshold: 10,
  loadingSpinnerDelegate: <div/>,
  className: ''
};

ChatView.propTypes = {
  flipped: PropTypes.bool,
  scrollLoadThreshold: PropTypes.number,
  onInfiniteLoad: PropTypes.func.isRequired,
  handleScroll: PropTypes.func,
  loadingSpinnerDelegate: PropTypes.element,
  className: PropTypes.string
};