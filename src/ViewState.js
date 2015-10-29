var _last = require('lodash.last');


function computeViewState (scrollTop, measuredItemsHeight, measuredLoadSpinner,
                           numChildren) {

  //console.assert(scrollHeight === measuredItemsHeight, scrollHeight + ' ' + measuredItemsHeight);

  return {
    scrollTop: scrollTop,
    numChildren: numChildren,
    measuredLoadSpinner: measuredLoadSpinner,
    measuredItemsHeight: measuredItemsHeight // same as scrollHeight todo get rid of
  };
}

module.exports = {
  computeViewState: computeViewState
}