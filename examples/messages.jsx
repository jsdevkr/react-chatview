
function buildMessages (N) {
    var ms = [];
    for (var i = 0; i < N; ++i) {
        var sentence = words({min: 3, max: 50}).join(" ");
        var record = { text: sentence };
        ms.push(record);
    }
    return ms;
}


// Backwards, scrolling up lazy loads old messges, and new messages can come in any time.
var Messages = React.createClass({
    getInitialState: function() {
        return {
            messages: buildMessages(50),
            isInfiniteLoading: false
        };
    },

    handleInfiniteLoad: function() {
        this.setState({ isInfiniteLoading: true });
        setTimeout(function() {
            this.setState({
                isInfiniteLoading: false,
                messages: this.state.messages.concat(buildMessages(50))
            });
        }.bind(this), 2500);
    },

    render: function() {
        var elements = this.state.messages.map(function (record, i) {
            var style = { height: undefined };
            return <div className="infinite-list-item" data-i={i} style={style}>{i} {record.text}</div>;
        });

        var loadSpinner = <div className="infinite-list-item">Loading...</div>;

        // must pre-compute height of all elements
        return (
            <div className="Messages">
                <Infinite
                    maxChildren={15}
                    containerHeight={400}
                    // reverse={true}
                    infiniteLoadBeginBottomOffset={200}
                    onInfiniteLoad={this.handleInfiniteLoad}
                    loadingSpinnerDelegate={loadSpinner}
                    isInfiniteLoading={this.state.isInfiniteLoading}
                    timeScrollStateLastsForAfterUserScrolls={1000}
                    diagnosticsDomElId="diagnostics">
                    {elements}
                </Infinite>
                <button onClick={this.receiveNewMessage}>Receive New Message</button>
                <pre id="diagnostics"></pre>
            </div>
        );
    },

    receiveNewMessage: function () {
        this.setState({
            messages: buildMessages(1).concat(this.state.messages)
        });
    }
});


window.app = React.render(<Messages />, document.getElementById('messages-example'));
