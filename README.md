hyperspider
===========

[![Build Status](https://secure.travis-ci.org/jed/hyperspider.png?branch=master)](http://travis-ci.org/jed/hyperspider)

hyperspider is a declarative [HATEOAS](http://en.wikipedia.org/wiki/HATEOAS) API crawler for [node.js](http://nodejs.org). Give it a list of url patterns, and it will recursively crawl your hypertext HTTP API, streaming back every matching endpoint.

hyperspider is great for folks that want to create clean, granular, and self-documenting hypertext APIs, but avoid the latency of remotely fetching hundreds of tiny HTTP resources.

Example
-------

Let's say you had a Twitter clone with a hypertext JSON API, including the following two sample endpoints:

### `GET /users/:id` (fetch a user)

```json
{
  "href": "/users/jedschmidt",
  "name": "Jed Schmidt",

  "location":  { "href": "/japan/tokyo" },
  "updates":   { "href": "/users/jedschmidt/updates" },
  "following": { "href": "/users/jedschmidt/following" },
  "followers": { "href": "/users/jedschmidt/followers" }
}
```

### `GET /users/:id/following` (fetch the users a user is following)

```json
{
  "href": "/users/jedschmidt/following",
  "items": [
    { "href": "/users/janl" },
    { "href": "/users/cramforce" },
    { "href": "/users/hblank" },
    { "href": "/users/theophani" }
  ]
}
```

To create a single `following-detailed` resource so that API consumers don't have to make a separate HTTP call for each resource, use hyperspider like this:

```javascript
var hyperspider = require("hyperspider")

var options = {
  host: "mytwitterclone.biz",
  path: [
    "/users/jed",
    "/users/jed/following",
    "/users/*"
  ]
})

hyperspider(options, function(err, data) {
  // data is an array with the result entities of 6 endpoints:
  // 1. /users/jedschmidt
  // 2. /users/jedschmidt/following
  // 3. /users/janl
  // 4. /users/cramforce
  // 5. /users/hblank
  // 6. /users/theophani
})
```

See the [tests](https://github.com/jed/hyperspider/blob/master/test/server.js) for a working example.

Installation
------------

Use [npm](http://npmjs.org) to install hyperspider:

`npm i hyperspider`

API
---

### req = hyperspider(options, [callback])

`options`: An object containing the same options as for node's [http.request](http://nodejs.org/docs/latest/api/all.html#all_http_request_options_callback) method, with one exception: `path` can be any of the following:

- a normal url path, such as `/users`
- a function that takes a path and returns a boolean
- a RegExp that matches a path
- a wildcard url path to turn into a RegExp, with `*` replaced by `[^/]+` and `**` replaced by `.*?`
- an array containing any of the above

Note that `path` must contain at least one normal url path to serve as the starting point for the crawl.

`callback(err, data)`: Buffers the event stream into a single callback. `err` is null if no errors occurred, and otherwise an array of errors. data is an array of string entities, one for each successful HTTP call. Omit this to listen for a stream of events.

### req.extract (or hyperspider.prototype.extract)

This method takes a single argument, an HTTP response body string. Override this before adding listeners to customize how hyperspider should extract urls from each resource. By default, the response body is parsed into JSON, extracting the value of every nested `href` property, but you could roll your own, such as parsing `Link` headers, etc.
