react-chatview
==============

[![npm version](https://badge.fury.io/js/react-chatview.svg)](https://badge.fury.io/js/react-chatview)

> Infinite scroll chat or feed component for React.js

[Changelog](CHANGELOG.md)

### Live Demo
[![Live Demo](screenshot.png?raw=true)](http://musician-peggy-71735.bitballoon.com/)

Here is the [live demo](http://musician-peggy-71735.bitballoon.com/), and [source code to the live demo](https://github.com/jsdevkr/react-chatview-sample), also [here is a simpler fiddle](https://jsfiddle.net/gimdongwoo/xo4fccbu/).

### Why another infinite scroll component?

As of time of this writing, other efforts are missing killer features:
 * browser layout & resize "just works" (no need to know any heights in advance)
 * Works as newsfeed (infinite load down) or chat (infinite load up)
 * hardware accelerated scrolling

This work originated as a fork and modifications of [seatgeek/react-infinite](https://github.com/seatgeek/react-infinite), and was subsequently rewritten several times.

### Getting started

Install `react-chatview` using npm.

```shell
npm install react-chatview --save
```

You can also use a global-friendly UMD build:

```html
<script src="path-to-react-chatview/dist/react-chatview.min.js"></script>
```

You can also use a es5 commonjs build:

```html
<script src="path-to-react-chatview/lib/react-chatview.js"></script>
```

### Documentation

It is really easy to use. The actual rows of content should be passed as **children**. There are four interesting props:

 * `className` extra css class string for the container
 * `flipped` true for chat (newest at bottom), regular for newsfeed (newest at top)
 * `reversed` true for don't reverse elements
 * `scrollLoadThreshold` pixel distance from top that triggers an infinite load
 * `shouldTriggerLoad` callback function to check if chat view should trigger infinite load cycle when scroll passed `scrollLoadThreshold`. This callback is optional and by default  `onInfiniteLoad` is always triggered.
 * `onInfiniteLoad` load request callback, should cause a state change which renders more children
 * `returnScrollable` return scollable object for scrollable event handling

See the [jsfiddle example](https://jsfiddle.net/gimdongwoo/xo4fccbu/) for a complete working example.

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
