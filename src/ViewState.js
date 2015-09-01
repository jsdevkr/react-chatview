var _last = require('lodash.last');


function computeViewState (apertureTop, apertureHeight, measuredDistances, measuredLoadSpinner,
                           numChildren) {

  var anyHeightsMeasured = numChildren > 0;
  var measuredChildrenHeight = anyHeightsMeasured ? _last(measuredDistances) : null;

  return {
    apertureHeight: apertureHeight,
    apertureTop: apertureTop,

    measuredChildrenHeight: measuredChildrenHeight,

    numChildren: numChildren,

    measuredDistances: measuredDistances,
    measuredLoadSpinner: measuredLoadSpinner
  };
}

module.exports = {
  computeViewState: computeViewState
}