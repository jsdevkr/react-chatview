(function (){

  var ChatRow = React.createClass({

    propTypes: {
      myself: React.PropTypes.bool,
      text: React.PropTypes.string.isRequired,
      time: React.PropTypes.string.isRequired
    },

    render: function () {
      var maybeImg = this.props.imageHref
          ? <img src={this.props.imageHref} width="300" height="185" />
          : null;

      return (
          <div className="infinite-list-item">
            <p>{this.props.text}</p>
            {maybeImg}
            <time>{this.props.time}</time>
          </div>
      );
    }
  });

  var DayDateSplitterRow = React.createClass({
    render: function () {
      return (
          <div className="infinite-list-item">
            <h4>{this.props.daydate}</h4>
          </div>
      );
    }
  });


  function row (record, i) {
    if (record.type === 'chat') {
      return <ChatRow myself={record.myself}
                      text={'' + i + ' ' + record.text}
                      time={record.time}
                      imageHref={record.imageHref}/>;
    }
    if (record.type === 'daydate') {
      return <DayDateSplitterRow daydate={record.daydate} />;
    }
  }

  var Messages = React.createClass({

    getInitialState: function () {
      return {
        messages: randomMessages(50),
        isInfiniteLoading: false
      };
    },

    render: function () {
      var rows = this.state.messages.map(row);

      var typingIndicator = <div className="infinite-list-item">
        <p>...</p>
        <span>alice is typing</span>
      </div>;

      var loadSpinner = <div className="infinite-list-item infinite-load-spinner">Loading...</div>;

      // DM top level "dialog" div also had "container-fluid" class but it wasn't doing anything?
      return (
          <div className="chatdemo">
            <Infinite ref="infinite"
                      className="chat"
                      maxChildren={15}
                      flipped={true}
                      containerHeight={500}
                      infiniteLoadBeginBottomOffset={200}
                      onInfiniteLoad={this.handleInfiniteLoad}
                      loadingSpinnerDelegate={loadSpinner}
                      isInfiniteLoading={this.state.isInfiniteLoading}
                >
              {[typingIndicator].concat(rows)}
            </Infinite>
          </div>
      );
    },

    handleInfiniteLoad: function () {
      this.setState({isInfiniteLoading: true});
      setTimeout(function() {
        this.setState({
          isInfiniteLoading: false,
          messages: this.state.messages.concat(randomMessages(25))
        });
      }.bind(this), 300);
    }
  });

  window.Messages = Messages;
}());
