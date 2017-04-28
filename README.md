react-chatview-es6
==================

> is forked from [dustingetz/react-chatview](https://github.com/dustingetz/react-chatview) Thank you dustingetz!

> Infinite scroll chat or feed component for React.js

[Changelog](CHANGELOG.md)

### Live Demo
[![Live Demo](screenshot.png?raw=true)](http://musician-peggy-71735.bitballoon.com/)

Here is the [live demo](http://musician-peggy-71735.bitballoon.com/), and [source code to the live demo](https://github.com/dustingetz/messages), also [here is a simpler fiddle](https://jsfiddle.net/dustingetz/xvqzw747/).

### Why another infinite scroll component? 

As of time of this writing, other efforts are missing killer features:
 * browser layout & resize "just works" (no need to know any heights in advance)
 * Works as newsfeed (infinite load down) or chat (infinite load up) 
 * hardware accelerated scrolling 

This work originated as a fork and modifications of [seatgeek/react-infinite](https://github.com/seatgeek/react-infinite), and was subsequently rewritten several times.

### Getting started

Install `react-chatview-es6` using npm.

```shell
npm install react-chatview-es6 --save
```

You can also use a global-friendly UMD build:

```html
<script src="path-to-react-chatview-es6/dist/react-chatview.min.js"></script>
```

You can also use a es5 commonjs build:

```html
<script src="path-to-react-chatview-es6/lib/react-chatview.js"></script>
```

### Documentation

It is really easy to use. The actual rows of content should be passed as **children**. There are four interesting props:

 * `className` extra css class string for the container
 * `flipped` true for chat (newest at bottom), regular for newsfeed (newest at top)
 * `reversed` true for don't reverse elements
 * `scrollLoadThreshold` pixel distance from top that triggers an infinite load
 * `onInfiniteLoad` load request callback, should cause a state change which renders more children
 * `returnScrollable` return scollable object for scrollable event handling

See the [jsfiddle example](https://jsfiddle.net/dustingetz/xvqzw747/) for a complete working example.

### Todo

 * Not actually infinite - currently all elements that have been loaded remain the dom
 * auto-scroll to newest message when appropriate (pinning)
 
	> use `returnScrollable` and set `scrollable.scrollTop` to `scrollable.scrollHeight`
 
 * auto-correct scroll jitter when content resizes or is added above/below the focus point
 * configurable loading spinner
 * optimize for mobile (but it works)


There are probably more features missing. Please open an issue!

### Please write me if you use this! :)

If this project is valued I will invest more time in it.
