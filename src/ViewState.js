var _takeWhile = require('lodash.takewhile');
var _isFinite = require('lodash.isFinite');
var _last = require('lodash.last');
var bs = require('./utils/binary_index_search');

/**
 * Three cases to consider.
 *    no items measured (first render)
 *    some items measured (subsequent renders)
 *    all items measured (last few renders before infinite load)
 *
 * aperture: which is the fixed view of visible items. domEl ref "scrollable"
 * apertureHeight: height of the visible items view/window
 * apertureTop is pixel distance from top of scrollable to first visible node.
 *
 * scrollableHeight is the .scrollHeight of the scrollable div which conceptually,
 *   = frontSpacer + displayablesHeight + backSpacer [+ loadSpinner]
 *   ~ perfectChildrenHeight [+ loadSpinner]
 *   ~ measuredChildrenHeight [+ loadSpinner]
 *
 * It has nothing to do with the apertureHeight. If all heights aren't known, we can't know the
 * perfectMeasuredScrollableHeight. Determined by browser layout. Reverse mode depends on this value,
 * so in reverse mode, we always render in forward mode once, measure, then immediately re-render.
 **/
function computeViewState (apertureTop, apertureHeight, measuredDistances, prevMeasuredScrollableHeight,
                           numChildren, maxChildrenPerScreen, flipped) {

  var apertureBottom = apertureTop + apertureHeight;


  var visibleStart_DistanceFromFront;
  var visibleEnd_DistanceFromFront;
  if (!flipped) {
    visibleStart_DistanceFromFront = apertureTop;
    visibleEnd_DistanceFromFront = apertureBottom;
  }
  else {
    console.assert(_isFinite(prevMeasuredScrollableHeight), 'must render in forwards mode the first frame, to measure scrollableHeight');
    visibleStart_DistanceFromFront = prevMeasuredScrollableHeight - apertureBottom;
    visibleEnd_DistanceFromFront = prevMeasuredScrollableHeight - apertureTop;
  }

  // sum the heights until heights >= apertureTop, number of heights is visibleStart.
  var visibleStart = _takeWhile(measuredDistances, (d) => { return d < visibleStart_DistanceFromFront; }).length;


  var numItemsMeasured = measuredDistances.length;
  var anyHeightsMeasured = numItemsMeasured > 0;
  var allHeightsMeasured = numChildren === numItemsMeasured;

  /**
   * perfectChildrenHeight and displayablesHeight is not knowable until we measure it after render,
   * as depends on browser layout.
   */
  var perfectChildrenHeight = allHeightsMeasured ? _last(measuredDistances) : null;
  var measuredChildrenHeight = anyHeightsMeasured ? _last(measuredDistances) : null;


  /**
   * If we don't know the exact desired scrollHeight, we can't compute visibleEnd,
   * so estimate it, such that it will always be more items displayed than fit on a screen.
   * A few too many elements in the dom doesn't matter.
   * Do we need a bottom spacer in this case? Yeah, if we've seen more heights that where we
   * are but not all the heights, so the scroll area doesn't grow then shrink.
   */
  var visibleEnd; // not inclusive.. Math range notation: [visibleStart, visibleEnd)
  if (allHeightsMeasured) {
    var foundIndex = bs.binaryIndexSearch(measuredDistances, visibleEnd_DistanceFromFront, bs.opts.CLOSEST_HIGHER);
    var found = typeof foundIndex !== 'undefined';
    visibleEnd = found
        ? foundIndex + 1 // don't understand why we are off by one here.
        : numItemsMeasured;
    }
  else {
    visibleEnd = visibleStart + maxChildrenPerScreen;
  }
  // add ANOTHER maxChildrenPerScreen, which are never visible, so we always have room to scroll
  // down. Doing it this way, rather then adding apertureHeight to the backSpace, ensures that
  // if we scroll all the way down we bump into the bottom and can't scroll past the last child.
  visibleEnd = visibleEnd + maxChildrenPerScreen;

  /**
   * displayablesHeight is not knowable until after render as we measure it from the browser layout.
   * visibleStart=0 means zero distance. This indexing is weird, I'm not sure why.
   *
   * On the first render/frame that adds new, not-yet-measured item, we will have an incorrect
   * displayablesHeight because we can't compute it prefectly until it actually hits the dom.
   * That's okay - just use the previous displayablesHeight. We're probably only off by a few pixels.
   */

  // may be past the end of measuredHeights if we haven't yet measured these now-visible items.
  // Don't want this value null if anyHeightsMeasured, because backSpace depends on it.
  // Fallback to prior render's value. BackSpacer is an approximation anyway.
  //console.assert(visibleEnd >= numItemsMeasured);
  var numNewlyVisibleItems = Math.max(0, visibleEnd - numItemsMeasured);
  //console.assert(numNewlyVisibleItems >= 0);
  var visibleEndHeight = anyHeightsMeasured
      ? measuredDistances[visibleEnd-numNewlyVisibleItems-1]
      : null;
  var visibleStartHeight = (visibleStart-numNewlyVisibleItems > 0 // why is this case special?
      ? measuredDistances[visibleStart-numNewlyVisibleItems-1]
      : 0);

  var displayablesHeight;
  if (anyHeightsMeasured) {
    displayablesHeight = visibleEndHeight - visibleStartHeight;
  }
  else {
    displayablesHeight = null;
  }

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
    var actualVisibleEnd = Math.min(visibleEnd, numItemsMeasured);
    backSpace = perfectChildrenHeight - measuredDistances[actualVisibleEnd-1];
  }
  else if (anyHeightsMeasured) {
    // Don't have all the heights, so we know there is more we haven't seen/measured,
    // and we don't know how much more. Leave an extra screenful of room to scroll down.
    // If we have now-visible items that aren't measured yet, fallback to the last value we have.
    // The measuredChildrenHeight should monotonically increase over time.
    // measuredScrollableHeight should also, except for the loadSpinner.
    backSpace = measuredChildrenHeight - visibleEndHeight;
    // the visibleEndHeight accounts for extra screenful of visible children, which are never onscreen
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
  var measuredScrollableHeight = frontSpace + displayablesHeight + backSpace /*+loadSpinner*/;
  if (anyHeightsMeasured) {
    console.assert(measuredScrollableHeight >= measuredChildrenHeight);
  }

  // Some sanity checks and documentation of assumptions.
  console.assert(apertureBottom - apertureTop === apertureHeight);
  console.assert(_isFinite(visibleStartHeight) && visibleStartHeight >= 0);
  console.assert(visibleEndHeight === null || (_isFinite(visibleEndHeight) && visibleEndHeight >= 0));
  console.assert(_isFinite(frontSpace) && frontSpace >= 0);
  console.assert(_isFinite(backSpace) && backSpace >= 0);
  console.assert(_isFinite(visibleStart) && visibleStart >= 0 && visibleStart <= numChildren);
  console.assert(_isFinite(visibleEnd) && visibleEnd >= 0 /*&& visibleEnd <= numChildren*/);
  console.assert(_isFinite(apertureHeight));
  console.assert(_isFinite(apertureBottom));
  console.assert(_isFinite(perfectChildrenHeight) || perfectChildrenHeight === null);
  console.assert(_isFinite(displayablesHeight) || displayablesHeight === null);
  console.assert(_isFinite(measuredChildrenHeight) || measuredChildrenHeight === null);




  return {
    visibleStart: visibleStart,
    visibleEnd: visibleEnd,
    visibleStartHeight: visibleStartHeight,
    visibleEndHeight: visibleEndHeight,
    visibleStart_DistanceFromFront: visibleStart_DistanceFromFront,
    visibleEnd_DistanceFromFront: visibleEnd_DistanceFromFront,

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
    measuredScrollableHeight: measuredScrollableHeight, // actually isn't a measurement, it's computed
    prevMeasuredScrollableHeight: prevMeasuredScrollableHeight, // really measured from dom

    numChildren: numChildren,
    maxChildrenPerScreen: maxChildrenPerScreen
    //,measuredDistances: measuredDistances
  };
}

module.exports = {
  computeViewState: computeViewState
}