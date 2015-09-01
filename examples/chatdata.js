(function (){

  function randomChoice (coll) {
    return coll[Math.floor(Math.random()*coll.length)];
  }

  function randomSentence () {
    return words({min: 3, max: 30}).join(" ");
  }

  function randInt(lessThan) {
    return Math.floor(Math.random() * lessThan);
  }

  function randomMessage () {
    return {
      myself: randInt(2) === 0,
      time: '5:02pm',
      text: randomSentence(),
      imageHref: randInt(2) === 0 ? "/examples/stock-smiley-small.jpeg" : null
    };
  }

  function randomMessages (N) {
    var ms = [];
    for (var i = 0; i < N; ++i) {
      ms.push(randomMessage());
    }
    return ms;
  }

  function shortUid() {
    // http://stackoverflow.com/a/6248722/20003
    return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4)
  }


  window.randomMessages = randomMessages;
  window.shortUid = shortUid;
}());
