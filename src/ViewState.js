var _takeWhile = require('lodash.takewhile');
var _isFinite = require('lodash.isFinite');
var _last = require('lodash.last');
var bs = require('./utils/binary_index_search');

/**
 * Three cases to consider for forwards mode.
 *    no items measured (first render)
 *    some items measured (subsequent renders)
 *    all items measured (last few renders before infinite load)
 *
 * aperture: which is the fixed view of visible items
 * apertureHeight: height of the visible items view/window
 **/

function computeViewState (apertureHeight, measuredDistances, scrollTop, numChildren, maxChildrenPerScreen) {

  /**
   * viewTop is pixel distance from top of scrollable to first visible node.
   * sum the heights until heights >= viewTop, number of heights is visibleStart.
   */
  var viewTop = scrollTop; //var viewTop = Math.max(0, scrollTop - apertureHeight);
  var visibleStart = _takeWhile(this.measuredDistances, (d) => { return d < viewTop; }).length;


  var numItemsMeasured = measuredDistances.length;
  var anyHeightsMeasured = numItemsMeasured > 0;
  var allHeightsMeasured = numChildren === numItemsMeasured;

  /**
   * perfectChildrenHeight and displayablesHeight is not knowable until we measure it after render,
   * as depends on browser layout.
   */
  var perfectChildrenHeight = allHeightsMeasured ? _last(measuredDistances) : undefined;
  var measuredChildrenHeight = anyHeightsMeasured ? _last(measuredDistances) : undefined;


  /**
   * scrollableHeight is the .scrollHeight of the scrollable div which conceptually,
   *   = frontSpacer + displayablesHeight + backSpacer [+ loadSpinner]
   *   ~ perfectChildrenHeight [+ loadSpinner]
   *   ~ measuredChildrenHeight [+ loadSpinner]
   *
   * It has nothing to do with the apertureHeight.
   *
   * If all heights aren't known, we can't know the perfectMeasuredScrollableHeight.
   * Determined by browser layout - we can't ever depend on this. (is this correct???)
   */
  var scrollableHeight = undefined;

  /**
   * scrollableHeight is different than perfectScrollableHeight,
   * which if all heights known, = last(measuredDistances) [+ loadSpiner]
   */
  var perfectScrollableHeight = perfectChildrenHeight; // [+ loadspinner]
  var measuredScrollableHeight = measuredChildrenHeight; // [+ loadspinner]


  /**
   * If we don't know the exact desired scrollHeight, we can't compute visibleEnd,
   * so estimate it, such that it will always be more items displayed than fit on a screen.
   * A few too many elements in the dom doesn't matter.
   * Do we need a bottom spacer in this case? Yeah, if we've seen more heights that where we
   * are but not all the heights, so the scroll area doesn't grow then shrink.
   */

  //var apertureBottom = Math.min(totalScrollableHeightSeen, scrollTop + viewHeight); // wut
  var apertureBottom = scrollTop + apertureHeight;
  var visibleEnd; // not inclusive.. Math range notation: [visibleStart, visibleEnd)
  if (allHeightsMeasured) {
    var foundIndex = bs.binaryIndexSearch(measuredDistances, apertureBottom, bs.opts.CLOSEST_HIGHER);
    // foundIndex is off-by-one from the result i expected (50, expected 49), but works.
    var found = typeof foundIndex !== 'undefined';
    visibleEnd = found ? foundIndex : numItemsMeasured - 1;
    }
  else {
    visibleEnd = visibleStart + maxChildrenPerScreen * 2;
  }

  /**
   * displayablesHeight is not knowable until after render as we measure it from the browser layout.
   */
  var displayablesHeight = allHeightsMeasured
      ? measuredDistances[visibleEnd-1] - measuredDistances[visibleStart]
      : undefined;

  /**
   * The top spacer is exactly the height of the elided items above the displayable segment.
   * If we don' have the measurements yet, we know we're at the beginning so no spacer needed.
   */
  var frontSpace = measuredDistances.length > 0 ? measuredDistances[visibleStart] : 0;


  /**
   * The bottom spacer is the height of elided items below the displayable segment.
   * This height is only knowable if we have seen and measured all the items' height.
   * Exact measurement is only needed as we approach the bottom to prevent over-scrolling.
   * If we don't know any heights, just leave enough downward scroll room for at least
   * one more screenful of results.
   */
  var backSpace;
  if (anyHeightsMeasured) {
    backSpace = measuredChildrenHeight - measuredDistances[visibleEnd-1];
  }
  else if (allHeightsMeasured) {
    backSpace = perfectChildrenHeight - measuredDistances[visibleEnd-1];
  }
  else {
    // don't have any height data on first render,
    // leave about a screenful of room to scroll down.
    backSpace = apertureHeight;
  }


  // Some sanity checks and documentation of assumptions.
  console.assert(apertureBottom - viewTop === apertureHeight);
  console.assert(_isFinite(frontSpace));
  console.assert(_isFinite(backSpace));
  console.assert(_isFinite(visibleStart));
  console.assert(_isFinite(visibleEnd));
  console.assert(_isFinite(apertureHeight));
  console.assert(_isFinite(apertureBottom));
  console.assert(_isFinite(perfectChildrenHeight) || perfectChildrenHeight === undefined);
  console.assert(_isFinite(displayablesHeight) || displayablesHeight === undefined);
  console.assert(_isFinite(measuredChildrenHeight) || measuredChildrenHeight === undefined);


  return {
    visibleStart: visibleStart,
    visibleEnd: visibleEnd,
    frontSpace: frontSpace,
    backSpace: backSpace,
    apertureHeight: apertureHeight,
    apertureBottom: apertureBottom,
    perfectChildrenHeight: perfectChildrenHeight,
    measuredChildrenHeight: measuredChildrenHeight,
    displayablesHeight: displayablesHeight
  };
}

module.exports = {
  computeViewState: computeViewState
}