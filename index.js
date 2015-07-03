var http = require('http')
var serveStatic = require('serve-static')
var finalhandler = require('finalhandler')

var serve = function(port) {
    // Serve the built files
    var serve = serveStatic('app', {'index': ['index.html', 'index.htm']})

    // Create server
    var server = http.createServer(function(req, res){
      var done = finalhandler(req, res)
      serve(req, res, done)
    })

    server.listen(port)

    return server;
}

module.exports = {
    serve: serve
}
