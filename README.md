# Webperf
Compare the time it takes to load web pages from a browser using the [HTML5 Resource Timing API](http://www.w3.org/TR/resource-timing/), in the simplist possible way.  Just put a JSON configuration file somewhere that is accessible via a REST call, and fire it up in a [supported browser](http://caniuse.com/#feat=resource-timing).  No server, no database.

## Demo
Here is a [demo](http://gmoon.github.io/webperf/webperf.html?config=https://dl.dropboxusercontent.com/u/46275388/TodoMvcContestants.json) comparing two [TodoMVC](http://todomvc.com/) projects, using a configuration file stored in my public dropbox folder:

https://dl.dropboxusercontent.com/u/46275388/TodoMvcContestants.json

The pages reload automatically every 10 seconds and the timing statistics are updated.

## Quick start
In a folder that is served by your web server of choice:

```curl -O https://raw.githubusercontent.com/gmoon/webperf/master/dist/standalone/webperf.html```

Then browse to:

```
http://mydomain/myfolder/webperf.html?config=myurl
```

## Use Cases
