react-chatview
==============

> Infinite scroll chat or feed component for React.js

This is an alpha release, use at your own risk!


### Warnings
 * no documentation, you'll have to read the source
 * no tests
 * there are issues with the build


### Live Demo
[![Live Demo](screenshot.png?raw=true)](http://musician-peggy-71735.bitballoon.com/)

Here is the [source code to the live demo](https://github.com/dustingetz/messages).


### Features
 * works as newsfeed or chat (infinite load down, infinite load up)
 * hardware accelerated scrolling
 * arbitrary element contents, variable height
 * arbitrary height container, defers to browser for layout/resize


### Mis-features
 * Not actually infinite - currently all elements that have been loaded remain the dom


### Things that don't work yet, but maybe soon
 * configurable loading spinner
 * auto-scroll to newest message when appropriate (pinning)
 * auto-correct scroll jitter when content resizes or is added above/below the focus point
 * use webpack
 * optimize for mobile (but it works)


There are probably more features missing. Please open an issue!


This work originated as a fork and modifications of [seatgeek/react-infinite](https://github.com/seatgeek/react-infinite), and was subsequently rewritten several times.
