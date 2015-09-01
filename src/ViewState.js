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
 *
 * scrollableDomEl.scrollTop is always the height of aperatureTop, measured from the scrollable bottom.
 **/
function computeViewState (apertureTop, apertureHeight, measuredDistances, measuredLoadSpinner, prevMeasuredScrollableHeight,
                           numChildren, maxChildrenPerScreen, flipped) {

  var apertureBottom = apertureTop + apertureHeight;

  var anyHeightsMeasured = numChildren > 0;
  var measuredChildrenHeight = anyHeightsMeasured ? _last(measuredDistances) : null;

  console.assert(apertureBottom - apertureTop === apertureHeight);
  console.assert(_isFinite(apertureHeight));
  console.assert(_isFinite(apertureBottom));
  console.assert(_isFinite(measuredChildrenHeight));




  return {
    apertureHeight: apertureHeight,
    apertureBottom: apertureBottom,
    apertureTop: apertureTop,

    anyHeightsMeasured: anyHeightsMeasured,
    measuredChildrenHeight: measuredChildrenHeight,
    //measuredScrollableHeight: measuredScrollableHeight, // actually isn't a measurement, it's computed

    numChildren: numChildren,

    measuredDistances: measuredDistances,
    measuredLoadSpinner: measuredLoadSpinner
  };
}

module.exports = {
  computeViewState: computeViewState
}