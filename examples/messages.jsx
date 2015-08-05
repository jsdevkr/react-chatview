var ListItem = React.createClass({
    getDefaultProps: function() {
        return {
            height: 50,
            lineHeight: "50px"
        }
    },
    render: function() {

        return <div className="infinite-list-item" style={
            {
                height: this.props.height,
                lineHeight: this.props.lineHeight
            }
        }>
            List Item {this.props.index}
        </div>;
    }
});



var Messages = React.createClass({
    getInitialState: function() {
        return {
            elementHeights: this.generateVariableElementHeights(100),
            isInfiniteLoading: false
        };
    },

    generateVariableElementHeights: function(number, minimum, maximum) {
        minimum = minimum || 40;
        maximum = maximum || 100;
        var heights = [];
        for (var i = 0; i < number; i++) {
            heights.push(minimum + Math.floor(Math.random() * (maximum - minimum)));
        }
        return heights;
    },

    handleInfiniteLoad: function() {
        var that = this;
        this.setState({ isInfiniteLoading: true });
        setTimeout(function() {
            var newElements = that.generateVariableElementHeights(100);
            that.setState({
                isInfiniteLoading: false,
                elementHeights: that.state.elementHeights.concat(newElements)
            });
        }, 2500);
    },

    render: function() {
        var elements = this.state.elementHeights.map(function(el, i) {
            return <ListItem key={i} index={i} height={el} lineHeight={el.toString() + "px"}/>;
        });

        var loadSpinner = <div className="infinite-list-item">Loading...</div>;

        return <Infinite elementHeight={this.state.elementHeights}
                         containerHeight={250}
                         reverse={true}
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
