

function spliceArraySegmentAt(arrayRef, start, newArray) {
    var splice_args = [start, newArray.length].concat(newArray);
    var MAX_NUM_FN_ARGS = 32766;
    console.assert(splice_args.length < MAX_NUM_FN_ARGS, 'http://stackoverflow.com/questions/22747068/');
    Array.prototype.splice.apply(arrayRef, splice_args);
}

module.exports = spliceArraySegmentAt;