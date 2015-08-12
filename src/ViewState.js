var _takeWhile = require('lodash.takewhile');
var bs = require('./utils/binary_index_search');

/**
 * Three cases to consider
 *    no items measured (first render)
 *    some items measured (subsequent renders)
 *    all items measured (last few renders before infinite load)
 **/

function computeViewState (viewHeight, measuredDistances, scrollTop, numChildren, maxChildrenPerScreen) {

  /**
   * viewTop is pixel distance from top of scrollable to first visible node.
   * sum the heights until heights >= viewTop, number of heights is visibleStart.
   */
  var viewTop = scrollTop;
  //var  x = Math.max(0, scrollTop - viewHeight);
  var visibleStart = _takeWhile(this.measuredDistances, (d) => { return d < viewTop; }).length;


  /**
   * scrollableHeight is the .scrollHeight of the scrollable div which conceptually,
   *   = frontSpacer + displayablesHeight + backSpacer [+ loadSpinner]
   * It has nothing to do with the containerHeight, which is the fixed view of visible items.
   * This is different than the perfectMeasuredScrollableHeight, which if all heights known,
   *   = last(measuredDistances) [+ loadSpiner]
   * If all heights aren't known, we can't know the perfectMeasuredScrollableHeight.
   * displayablesHeight is not knowable, depends on browser layout.
   */

  var numItemsMeasured = measuredDistances.length;
  var allHeightsMeasured = numChildren === numItemsMeasured;

  // If we haven't measured all the children, this is only the height of children we've seen so far.
  // Fix or remove this poorly understood value.
  // This is undefined if no measurements yet.
  var totalScrollableHeightSeen = measuredDistances[numItemsMeasured-1];

  /**
   * If we don't know the exact desired scrollHeight, we can't compute visibleEnd,
   * so estimate it, such that it will always be more items displayed than fit on a screen.
   * A few too many elements in the dom doesn't matter.
   * Do we need a bottom spacer in this case? Yeah, if we've seen more heights that where we
   * are but not all the heights, so the scroll area doesn't grow then shrink.
   */

  //var viewBottom = Math.min(totalScrollableHeightSeen, scrollTop + viewHeight); // wut
  var viewBottom = scrollTop + viewHeight;
  var visibleEnd;
  if (allHeightsMeasured) {
    var foundIndex = bs.binaryIndexSearch(measuredDistances, viewBottom, bs.opts.CLOSEST_HIGHER);
    var found = typeof foundIndex !== 'undefined';
    visibleEnd = found
        ? foundIndex // this is off-by-one from the result i expected (50, expected 49), but works.
        : measuredDistances.length - 1;
    }
  else {
    visibleEnd = visibleStart + maxChildrenPerScreen * 2;
  }

  /**
   * The top spacer is exactly the height of the elided items above the displayable segment.
   * If we don' have the measurements yet, we know we're at the beginning so no spacer needed.
   */
  var frontSpace = measuredDistances.length > 0 ? measuredDistances[visibleStart] : 0;


  /**
   * The bottom spacer is the height of elided items below the displayable segment.
   * This height is only knowable if we have seen and measured all the items' height.
   * Exact measurement is only needed as we approach the bottom to prevent over-scrolling.
   * If we don't know the height, just leave enough downward scroll room for at least
   * one more screenful of results.
   */
  var totalScrollableHeight = allHeightsMeasured // Fix or remove this poorly understood value.
      ? measuredDistances[numItemsMeasured-1]
      : totalScrollableHeightSeen + viewHeight;
  var backSpace = totalScrollableHeight - measuredDistances[visibleEnd];


  // Some sanity checks and documentation of assumptions.
  console.assert(viewBottom - viewTop === viewHeight);
  console.assert(frontSpace !== undefined);
  console.assert(backSpace !== undefined);
  console.assert(visibleStart !== undefined);
  console.assert(visibleEnd !== undefined);
  console.assert(viewHeight !== undefined);
  console.assert(viewBottom !== undefined);


  return {
    visibleStart: visibleStart,
    visibleEnd: visibleEnd,
    frontSpace: frontSpace,
    backSpace: backSpace,
    viewHeight: viewHeight,
    viewBottom: viewBottom
  };
}

module.exports = {
  computeViewState: computeViewState
}