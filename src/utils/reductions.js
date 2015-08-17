
function reductions (coll, iteratee, seed) {
    var steps = [];

    var innerIteratee = (acc, val, i) => {
        steps.push(acc);
        return iteratee(acc, val, i);
    };

    var sum = seed === undefined
        ? coll.reduce(innerIteratee) // undefined seed would be used as the accumulator
        : coll.reduce(innerIteratee, seed);

    steps.push(sum);
    return steps;
}


module.exports = reductions;