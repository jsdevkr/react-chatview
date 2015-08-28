
var MessagesDemo = React.createClass({displayName: "MessagesDemo",
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
        }.bind(this), 1000);
    },

    componentWillMount: function () {
        this.diagnosticsUuid = shortUid();
    },

    render: function() {
        var elements = this.state.messages.map(function (record, i) {
            var style = { height: undefined };
            return React.createElement("div", {className: "infinite-list-item", "data-i": i, style: style}, i, " ", record.text);
        });

        var loadSpinner = React.createElement("div", {className: "infinite-list-item infinite-load-spinner"}, "Loading...");

        // must pre-compute height of all elements
        return (
            React.createElement("div", {className: "MessagesDemo"}, 
                React.createElement("div", {className: "chat"}, 
                    React.createElement(Infinite, {ref: "infinite", 
                        maxChildren: 15, 
                        containerHeight: 400, 
                        flipped: this.props.flipped, 
                        infiniteLoadBeginBottomOffset: 50, 
                        onInfiniteLoad: this.handleInfiniteLoad, 
                        loadingSpinnerDelegate: loadSpinner, 
                        isInfiniteLoading: this.state.isInfiniteLoading, 
                        diagnosticsDomElId: this.diagnosticsUuid}, 
                        elements
                    ), 
                    React.createElement("button", {onClick: this.receiveNewMessage}, "Receive New Message")
                ), 
                React.createElement("pre", {className: "diagnostics", id: this.diagnosticsUuid}), 
                React.createElement("div", {style: {clear: 'both'}})
            )
        );
    },

    receiveNewMessage: function () {
        this.setState({
            messages: buildMessages(1).concat(this.state.messages)
        });
    }
});

var App = React.createClass({displayName: "App",
    render: function () {
        return React.createElement("div", null, React.createElement(MessagesDemo, {ref: "a"}), React.createElement(MessagesDemo, {ref: "b", flipped: true}));
    }
});
window.app = React.render(React.createElement(App, null), document.getElementById('messages-example'));
