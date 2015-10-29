var _last = require('lodash.last');


function computeViewState (scrollTop, maskHeight, measuredItemsHeight, measuredLoadSpinner,
                           numChildren, clientHeight, scrollHeight) {

  //console.assert(scrollHeight === measuredItemsHeight, scrollHeight + ' ' + measuredItemsHeight);

  return {
    maskHeight: maskHeight,
    scrollTop: scrollTop,
    clientHeight: clientHeight,
    scrollHeight: scrollHeight,
    numChildren: numChildren,
    measuredLoadSpinner: measuredLoadSpinner,

    measuredItemsHeight: measuredItemsHeight // same as scrollHeight
  };
}

module.exports = {
  computeViewState: computeViewState
}