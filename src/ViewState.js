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
 * aperture: which is the fixed view of visible items. domEl ref "scrollable"
 * apertureHeight: height of the visible items view/window
 **/

function computeViewState (apertureHeight, measuredDistances, scrollTop, numChildren, maxChildrenPerScreen) {

  /**
   * apertureTop is pixel distance from top of scrollable to first visible node.
   * sum the heights until heights >= apertureTop, number of heights is visibleStart.
   */
  var apertureTop = scrollTop; //var apertureTop = Math.max(0, scrollTop - apertureHeight);
  var visibleStart = _takeWhile(measuredDistances, (d) => { return d < apertureTop; }).length;


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
    visibleEnd = visibleStart + maxChildrenPerScreen;
  }

  /**
   * displayablesHeight is not knowable until after render as we measure it from the browser layout.
   * visibleStart=0 means zero distance. This indexing is weird, I'm not sure why.
   *
   * On the first render/frame that adds new, not-yet-measured item, we will have an incorrect
   * displayablesHeight because we can't compute it prefectly until it actually hits the dom.
   * That's okay - just use the previous displayablesHeight. We're probably only off by a few pixels.
   */

  // may be past the end of measuredHeights if we haven't yet measured these now-visible items.
  // Don't want this value undefined if anyHeightsMeasured, because backSpace depends on it.
  // Fallback to prior render's value. BackSpacer is an approximation anyway.
  //console.assert(visibleEnd >= numItemsMeasured);
  var numNewlyVisibleItems = Math.max(0, visibleEnd - numItemsMeasured);
  //console.assert(numNewlyVisibleItems >= 0);
  var visibleEndHeight = measuredDistances[visibleEnd-numNewlyVisibleItems-1];
  var visibleStartHeight = (visibleStart-numNewlyVisibleItems > 0 // why is this case special?
      ? measuredDistances[visibleStart-numNewlyVisibleItems-1]
      : 0);

  var displayablesHeight;
  if (anyHeightsMeasured) {
    displayablesHeight = visibleEndHeight - visibleStartHeight;
  }
  else {
    displayablesHeight = undefined;
  }
  //var displayablesHeight = anyHeightsMeasured
  //    ? measuredDistances[visibleEnd-1] - (visibleStart > 0 ? measuredDistances[visibleStart-1] : 0)
  //    : undefined;

  /**
   * The top spacer is exactly the height of the elided items above the displayable segment.
   * If we don' have the measurements yet, we know we're at the beginning so no spacer needed.
   * visibleStart=0 means 0 space.
   */
  var frontSpace;
  if (visibleStart === 0) {
    frontSpace = 0;
  }
  else {
    frontSpace = anyHeightsMeasured ? measuredDistances[visibleStart-1] : 0;
  }


  /**
   * The bottom spacer is the height of elided items below the displayable segment.
   * This height is only knowable if we have seen and measured all the items' height.
   * Exact measurement is only needed as we approach the bottom to prevent over-scrolling.
   * If we don't know any heights, just leave enough downward scroll room for at least
   * one more screenful of results.
   */
  var backSpace;
  if (allHeightsMeasured) {
    backSpace = perfectChildrenHeight - measuredDistances[visibleEnd-1];
  }
  else if (anyHeightsMeasured) {
    // Don't have all the heights, so we know there is more we haven't seen/measured,
    // and we don't know how much more. Leave an extra screenful of room to scroll down.
    // If we have now-visible items that aren't measured yet, fallback to the last value we have.
    // The measuredChildrenHeight should monotonically increase over time.
    // measuredScrollableHeight should also, except for the loadSpinner.
    backSpace = measuredChildrenHeight - displayablesHeight + apertureHeight;
  }
  else {
    // don't have any height data on first render,
    // leave about a screenful of room to scroll down.
    backSpace = apertureHeight;
  }


  /**
   * scrollableHeight is different than perfectScrollableHeight,
   * which if all heights known, = last(measuredDistances) [+ loadSpiner]
   * These values aren't used, they are just for diagnostics.
   */
  var perfectScrollableHeight = perfectChildrenHeight; // [+ loadspinner]
  var measuredScrollableHeight = measuredChildrenHeight + backSpace; // [+ loadspinner]


  // Some sanity checks and documentation of assumptions.
  console.assert(apertureBottom - apertureTop === apertureHeight);
  console.assert(_isFinite(visibleStartHeight) && visibleStartHeight >= 0);
  console.assert(visibleEndHeight === undefined || (_isFinite(visibleEndHeight) && visibleEndHeight >= 0));
  console.assert(_isFinite(frontSpace) && frontSpace >= 0);
  console.assert(_isFinite(backSpace) && backSpace >= 0);
  console.assert(_isFinite(visibleStart) && visibleStart >= 0 && visibleStart <= numChildren);
  console.assert(_isFinite(visibleEnd) && visibleEnd >= 0 /*&& visibleEnd <= numChildren*/);
  console.assert(_isFinite(apertureHeight));
  console.assert(_isFinite(apertureBottom));
  console.assert(_isFinite(perfectChildrenHeight) || perfectChildrenHeight === undefined);
  console.assert(_isFinite(displayablesHeight) || displayablesHeight === undefined);
  console.assert(_isFinite(measuredChildrenHeight) || measuredChildrenHeight === undefined);

  if (anyHeightsMeasured) {
    console.assert(frontSpace + displayablesHeight + backSpace /*+loadSpinner*/ >= measuredScrollableHeight)
  }


  return {
    visibleStart: visibleStart,
    visibleEnd: visibleEnd,
    visibleStartHeight: visibleStartHeight,
    visibleEndHeight: visibleEndHeight,
    frontSpace: frontSpace,
    backSpace: backSpace,

    apertureHeight: apertureHeight,
    apertureBottom: apertureBottom,
    apertureTop: apertureTop,

    numItemsMeasured: numItemsMeasured,
    anyHeightsMeasured: anyHeightsMeasured,
    allHeightsMeasured: allHeightsMeasured,
    perfectChildrenHeight: perfectChildrenHeight,
    measuredChildrenHeight: measuredChildrenHeight,
    displayablesHeight: displayablesHeight,

    //scrollableHeight: scrollableHeight,   -- is this needed?
    perfectScrollableHeight: perfectScrollableHeight,
    measuredScrollableHeight: measuredScrollableHeight,

    numChildren: numChildren,
    maxChildrenPerScreen: maxChildrenPerScreen
    //,measuredDistances: measuredDistances
  };
}

module.exports = {
  computeViewState: computeViewState
}