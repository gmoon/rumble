# Rumble
Performance is critical to providing a good user experience on the web.  [Research](http://www.nngroup.com/articles/response-times-3-important-limits/) shows more than one second and user's flow of thought is interupted.  More than 10 seconds and you lose the user's attention.  

To help understand performance, modern browsers provide a [Resource Timing API](http://www.w3.org/TR/resource-timing/) that details out the amount of time it takes for each stage of a web request and response.  This is a fantastic resource, and tools like Chrome Developer Tools allow you to explore the data for every network request.  There is another class of enterprise tools that allow you to look at this data in agreggate, but they are often expensive or complicated (i.e. requires a server or a database) or both.

As a dev, tester, product manager, or consumer, maybe you want something that is minimal, elegant, and still gets the job done.  Rumble is an attempt to strike that balance.

Just put a JSON configuration file somewhere that is accessible via the web (I use my Dropbox public folder), host a single HTML page, and fire it up in a [supported browser](http://caniuse.com/#feat=resource-timing).  No server, no database, no problem.

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
1. Prove to your operations team that the VMs they turned over to you serve static HTML files 1,000% slower than the 4 year-old, bare-metal web servers they are trying to decomission (this was my actual use case)
1. Compare performance impact of code optimizations
