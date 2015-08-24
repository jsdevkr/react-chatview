
function shortUid() {
    // http://stackoverflow.com/a/6248722/20003
    return ("0000" + (Math.random()*Math.pow(36,4) << 0).toString(36)).slice(-4)
}

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
var MessagesDemo = React.createClass({
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
                messages: this.state.messages.concat(buildMessages(25))
            });
        }.bind(this), 2500);
    },

    componentWillMount: function () {
        this.diagnosticsUuid = shortUid();
    },

    render: function() {
        var elements = this.state.messages.map(function (record, i) {
            var style = { height: undefined };
            return <div className="infinite-list-item" data-i={i} style={style}>{i} {record.text}</div>;
        });

        var loadSpinner = <div className="infinite-list-item">Loading...</div>;

        // must pre-compute height of all elements
        return (
            <div className="MessagesDemo">
                <div className="chat">
                    <Infinite ref="infinite"
                        maxChildren={15}
                        containerHeight={400}
                        flipped={this.props.flipped}
                        infiniteLoadBeginBottomOffset={200}
                        onInfiniteLoad={this.handleInfiniteLoad}
                        loadingSpinnerDelegate={loadSpinner}
                        isInfiniteLoading={this.state.isInfiniteLoading}
                        diagnosticsDomElId={this.diagnosticsUuid}>
                        {elements}
                    </Infinite>
                    <button onClick={this.receiveNewMessage}>Receive New Message</button>
                </div>
                <pre className="diagnostics" id={this.diagnosticsUuid}></pre>
                <div style={{clear: 'both'}}/>
            </div>
        );
    },

    receiveNewMessage: function () {
        this.setState({
            messages: buildMessages(1).concat(this.state.messages)
        });
    }
});

var App = <div><MessagesDemo /><MessagesDemo flipped={true} /></div>;
window.app = React.render(App, document.getElementById('messages-example'));
