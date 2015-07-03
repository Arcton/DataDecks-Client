var http = require('http')
var serveStatic = require('serve-static')

var serve = function(port) {
    var spawn = require('child_process').spawn;
    var gulpPath = './';
    process.chdir(__dirname);
    process.chdir(gulpPath);
    var child = spawn('./node_modules/.bin/gulp', ['build']);

    // Print output from Gulpfile
    child.stdout.on('data', function(data) {
        if (data) {
            console.log(data.toString())
        }
    });

    // Serve the built files
    var serve = serveStatic('app', {'index': ['index.html', 'index.htm']})

    // Create server
    var server = http.createServer(function(req, res){
      serve(req, res)
    })

    // Listen
    server.listen(port);
}

module.exports = {
    serve: serve
}
