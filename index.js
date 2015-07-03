var http = require('http')
var serveStatic = require('serve-static')

var serve = function(port) {
    // Serve the built files
    var serve = serveStatic('app', {'index': ['index.html', 'index.htm']})

    // Create server
    var server = http.createServer(function(req, res){
      serve(req, res)
    })

    return server;
}

module.exports = {
    serve: serve
}
