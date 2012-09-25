var hyperspider = require("../")
var http = require("http")
var assert = require("assert")

var server = http.createServer()

server.on("request", function(req, res) {
  var match = req.url.match(/\/users\/(\w+)\/following-detailed/)
  var first = true

  if (match) {
    var crawl = hyperspider({
      port: this.address().port,
      path: [
        "/users/" + match[1],
        "/users/" + match[1] + "/following",
        "/users/*"
      ]
    })

    res.writeHead(200)
    res.write("[")

    crawl.on("data", function(response) {
      first ? first = false : res.write(",")
      res.write(response.body)
    })

    crawl.on("end", function() {
      res.end("]")
    })

    crawl.on("error", function() {
      // ignore
    })

    return
  }

  try {
    var obj = require(__dirname + req.url)
    res.writeHead(200)
    res.end(JSON.stringify(obj))
  }

  catch (err) {
    var obj = {error: err.message}
    res.writeHead(404)
    res.end(JSON.stringify(obj))
  }
})

server.listen(function() {
  var opts = {
    port: this.address().port,
    path: "/users/jedschmidt/following-detailed"
  }

  http.get(opts, onResponse)

  function onResponse(res) {
    var body = ""
    res.on("data", function(chunk){ body += chunk })
    res.on("end", function() {
      var obj

      assert.doesNotThrow(function(){ obj = JSON.parse(body) })
      assert.ok(Array.isArray(obj))
      assert.equal(obj.length, 6)

      obj.forEach(function(item) {
        assert.ok("href" in item)
      })

      server.close()
    })
  }
})
