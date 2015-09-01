var _last = require('lodash.last');


function computeViewState (apertureTop, apertureHeight, measuredItemsHeight, measuredLoadSpinner,
                           numChildren) {

  return {
    apertureHeight: apertureHeight,
    apertureTop: apertureTop,
    measuredItemsHeight: measuredItemsHeight,
    numChildren: numChildren,
    measuredLoadSpinner: measuredLoadSpinner
  };
}

module.exports = {
  computeViewState: computeViewState
}