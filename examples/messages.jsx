var ListItem = React.createClass({
    getDefaultProps: function() {
        return {
            height: 50,
            lineHeight: "50px"
        }
    },
    render: function() {
        var style = {
            height: this.props.height,
            lineHeight: this.props.lineHeight
        };
        return <div className="infinite-list-item" style={style}>
            List Item {this.props.index}
        </div>;
    }
});

// var sentence = words({min: 8, max: 12}).join(" ");

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
            messages: buildMessages(25),
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

    render: function() {
        var elements = this.state.messages.map(function (record) {
            var style = { height: 100 };
            return <div className="infinite-list-item" style={style}>{record.text}</div>;
        });

        var loadSpinner = <div className="infinite-list-item">Loading...</div>;

        // must pre-compute height of all elements
        return <Infinite elementHeight={100}
                         containerHeight={250}
                         // reverse={true}
                         infiniteLoadBeginBottomOffset={200}
                         onInfiniteLoad={this.handleInfiniteLoad}
                         loadingSpinnerDelegate={loadSpinner}
                         isInfiniteLoading={this.state.isInfiniteLoading}
                         timeScrollStateLastsForAfterUserScrolls={1000}>
            {elements}
        </Infinite>;
    }
});


React.render(<Messages />, document.getElementById('messages-example'));
