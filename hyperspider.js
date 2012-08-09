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
      var body = ""

      if (res.statusCode >= 400) {
        body += http.STATUS_CODES[res.statusCode]
        body += " (" + path + ")"

        this.emit("error", new Error(body), res)
        this.completed++
        this.crawl()

        return
      }

      res.on("data", function(data){ body += data })
      res.on("end", function() {
        try {
          this.emit("data", body, res)

          Array.prototype.push.apply(
            this.input,
            this.extract(body)
              .filter(this.verify, this)
              .filter(this.dedupe, this)
          )
        }

        catch (error) {
          this.emit("error", error, res)
        }

        this.completed++
        this.crawl()
      }.bind(this))
    }.bind(this, this.options.path))
  }

  return this
}

Hyperspider.prototype.extract = function(body, res) {
  var paths = []

  JSON.parse(body, function(key, value) {
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
    .on("end"   , function(   ){ cb(errs[0] && errs, data) })

  return this
}

module.exports = function(opts, cb) {
  var apider = new Hyperspider(opts)

  if (cb) apider.run(cb)

  return apider
}

module.exports.prototype = Hyperspider.prototype
