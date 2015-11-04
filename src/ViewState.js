var _last = require('lodash.last');


function computeViewState (scrollTop, scrollHeight, measuredItemsHeight, measuredLoadSpinner) {

  //console.assert(scrollHeight === measuredItemsHeight, scrollHeight + ' ' + measuredItemsHeight);

  return {
    scrollTop: scrollTop,
    scrollHeight: scrollHeight,
    measuredLoadSpinner: measuredLoadSpinner,
    measuredItemsHeight: measuredItemsHeight // same as scrollHeight todo get rid of
  };
}

module.exports = {
  computeViewState: computeViewState
}