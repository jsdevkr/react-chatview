(function (){

  var ChatRow = React.createClass({

    propTypes: {
      myself: React.PropTypes.bool,
      text: React.PropTypes.string.isRequired,
      time: React.PropTypes.string.isRequired
    },

    render: function () {
      var maybeImg = this.props.imageHref
          ? <img src={this.props.imageHref} style={{height:'auto'}}/>
          : null;

      return (
          <div className="infinite-list-item">
            <time>{this.props.time}</time>
            <span>{this.props.text}</span>
            <div>{maybeImg}</div>
          </div>
      );
    }
  });

  function row (record, i) {
    return <ChatRow myself={record.myself}
                    text={record.text}
                    key={i}
                    time={record.time}
                    imageHref={record.imageHref}/>;
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
                      containerHeight={400}
                      infiniteLoadBeginBottomOffset={50}
                      onInfiniteLoad={this.handleInfiniteLoad}
                      loadingSpinnerDelegate={loadSpinner}
                      isInfiniteLoading={this.state.isInfiniteLoading}
                      diagnosticsDomElId="diagnostics"
                >
              {[typingIndicator].concat(rows)}
            </Infinite>
            <pre className="diagnostics" id="diagnostics"></pre>
            <div style={{clear: 'both'}}/>
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
      }.bind(this), 1000);
    }
  });

  window.Messages = Messages;
}());
