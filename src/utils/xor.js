function xor (a,b) {
    // xor: if the inputs are different, return true
    //     (true ^ true) === 1 => false
    //     (true ^ false) === 1 => true
    return (a ^ b) === 1;
}


module.exports = xor;
