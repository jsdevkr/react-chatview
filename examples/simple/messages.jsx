
var MessagesDemo = React.createClass({
    getInitialState: function() {
        return {
            messages: randomMessages(50),
            isInfiniteLoading: false
        };
    },

    handleInfiniteLoad: function() {
        this.setState({ isInfiniteLoading: true });
        setTimeout(function() {
            this.setState({
                isInfiniteLoading: false,
                messages: this.state.messages.concat(randomMessages(25))
            });
        }.bind(this), 1000);
    },

    componentWillMount: function () {
        this.diagnosticsUuid = shortUid();
    },

    render: function() {
        var elements = this.state.messages.map(function (record, i) {
            return <div className="infinite-list-item" data-i={i}>{i} {record.text}</div>;
        });

        var loadSpinner = <div className="infinite-list-item infinite-load-spinner">Loading...</div>;

        return (
            <div className="MessagesDemo">
                <div className="chat">
                    <Infinite ref="infinite"
                        maxChildren={15}
                        containerHeight={400}
                        flipped={this.props.flipped}
                        infiniteLoadBeginBottomOffset={50}
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
            messages: randomMessages(1).concat(this.state.messages)
        });
    }
});

var App = React.createClass({
    render: function () {
        return <div><MessagesDemo ref="a" /><MessagesDemo ref="b" flipped={true} /></div>;
    }
});
window.app = React.render(<App />, document.getElementById('messages-example'));
