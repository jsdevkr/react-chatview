react-feed
==========

> Infinite scroll chat or feed component for React.js

This is an alpha release, use at your own risk!


Warnings
 * examples don't work yet
 * no tests yet


Features
 * works as newsfeed or chat (infinite load down, infinite load up)
 * hardware accelerated scrolling
 * arbitrary element contents, variable height
 * arbitrary height container, defers to browser for layout/resize


Mis-features
 * Not actually infinite - currently all elements that have been loaded remain the dom (this can probably be fixed)
 * Not optimized for mobile


Things that don't work yet
 * configurable loading spinner
 * auto-scroll to newest message when appropriate (pinning)
 * use webpack
 * fix and improve demos


Things that are possible to make work but we haven't invested time into yet
 * auto-correct scroll jitter when content resizes or is added above/below the focus point
 * optimize for mobile


Things we aren't sure about
 * support an actual infinite number of elemenets, like 10,000+


There are probably more features missing. Please open an issue!
