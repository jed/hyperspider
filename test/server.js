var hyperspider = require("../")
var http = require("http")
var assert = require("assert")

var server = http.createServer().listen(8000)

server.on("request", function(req, res) {
  var match = req.url.match(/\/users\/(\w+)\/following-detailed/)
  var first = true

  if (match) {
    var crawl = hyperspider({
      port: 8000,
      path: [
        "/users/" + match[1],
        "/users/" + match[1] + "/following",
        "/users/*"
      ]
    })

    res.writeHead(200)
    res.write("[")

    crawl.on("data", function(body) {
      first ? first = false : res.write(",")
      res.write(body)
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

http.get(
  "http://localhost:8000/users/jedschmidt/following-detailed",
  function(res) {
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
)
