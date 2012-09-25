var events = require("events")
var http   = require("http")

function Hyperspider(options) {
  events.EventEmitter.call(this)

  this.options  = {} // options passed to http.get
  this.includes = [] // patterns that paths must match
  this.input    = [] // paths to crawl

  Object.keys(options).forEach(function(key) {
    this.options[key] = options[key]
  }, this)

  this.include(this.options.path || [])

  this.once("newListener", this.crawl.bind(this))
}

Hyperspider.prototype = new events.EventEmitter

Hyperspider.prototype.cursor = 0
Hyperspider.prototype.completed = 0

Hyperspider.prototype.include = function(path) {
  switch (toString.call(path)) {
    case "[object Array]":
      path.forEach(this.include, this)

      return this

    case "[object String]":
      if (path.indexOf("*") < 0) this.input.push(path)

      else this.include(new RegExp(
        path
          .replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&")
          .replace(/\*\*/g, ".*?")
          .replace(/\*/g, "[^\/]+")
          .replace(/^/, "^")
          .replace(/$/, "$")
      ))

      return this

    case "[object Function]":
      this.includes.push(path)

      return this

    case "[object RegExp]":
      this.include(path.test.bind(path))

      return this

    default:
      throw new Error("Invalid path pattern.")
  }
}

Hyperspider.prototype.verify = function(path) {
  return this.includes.some(function(fn){ return fn(path) })
}

Hyperspider.prototype.dedupe = function(path) {
  return this.input.indexOf(path) < 0
}

Hyperspider.prototype.crawl = function() {
  if (this.completed == this.input.length) {
    return this.emit("end")
  }

  while (this.cursor < this.input.length) {
    this.options.path = this.input[this.cursor++]

    http.get(this.options, function(path, res) {
      res.body = ""

      res.on("data", function(data){ res.body += data })

      res.on("end", function() {
	if (res.statusCode >= 400) {
	  var error = new Error(http.STATUS_CODES[res.statusCode])
	  error.response = res
	  this.emit("error", error)
	}

	else try {
          Array.prototype.push.apply(
            this.input,
	    this.extract(res)
              .filter(this.verify, this)
              .filter(this.dedupe, this)
          )

	  this.emit("data", res)
        }

        catch (error) {
	  error.response = res
	  this.emit("error", error)
        }

        this.completed++
        this.crawl()
      }.bind(this))
    }.bind(this, this.options.path))
  }

  return this
}

Hyperspider.prototype.extract = function(res) {
  var paths = []

  JSON.parse(res.body, function(key, value) {
    if (key == "href") paths.push(value)
  })

  return paths
}

Hyperspider.prototype.run = function(cb) {
  var errs = []
  var data = []

  this
    .on("data"  , function(obj){ data.push(obj) })
    .on("error" , function(obj){ errs.push(obj) })
    .on("end"   , function() {
      errs.forEach(function(err, i){ err.next = errs[i + 1] })
      cb(errs[0], data)
    })

  return this
}

module.exports = function(opts, cb) {
  var hyperspider = new Hyperspider(opts)

  if (cb) hyperspider.run(cb)

  return hyperspider
}

module.exports.prototype = Hyperspider.prototype
