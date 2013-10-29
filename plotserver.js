var fs = require("fs");
var url = require("url");
var http = require("http");
var mime = require("mime");
var utils = require("util");
var posix = require('posix');
var logger = require("./logger");
var common = require("./static/common");
var httpserver = require("./httpserver");
//
// ===============================================
//
//                  HttpGet
//
// ===============================================
//

httpNotFound = function(response) {
    response.writeHead(404, {"Content-Type": "text/text"});
    response.end("File not found.\n");
};

httpInternalError = function(response) {
    response.writeHead(500, {"Content-Type": "text/text"});
    response.end("An internal error occured.\n");
};

createFullPath = function(fullPath, callback) {
    if (fullPath.indexOf("/") == -1) {
        callback(null);
        return;
    }
    var path = require("path");
    var fs = require("fs");
    var parts = path.dirname(path.normalize(fullPath)).split("/");
    var working = "./";
    var pathList = [];
    var exists = null;
    if (fs.exists)
        exists = fs.exists;
    else
        exists = path.exists;
    for(var i = 0, max = parts.length; i < max; i++) {
        working = path.join(working, parts[i]);
        pathList.push(working);
    }
    var recursePathList = function recursePathList(paths) {
        if(0 === paths.length) {
            callback(null);
            return ;
        }
        var working = paths.shift();
        try {
            exists(working, function(exists) {
                if(!exists) {
                    try {
                        fs.mkdir(working, 0755, function() {
                            recursePathList(paths);
                        });
                    }
                    catch(e) {
                        callback(new Error("Failed to create path: " + working + " with " + e.toString()));
                    }
                }
                else {
                    recursePathList(paths);             
                }
            });
        }
        catch(e) {
            callback(new Error("Invalid path specified: " + working));
        }
    }
    
    if(0 === pathList.length)
        callback(new Error("Path list was empty"));
    else
        recursePathList(pathList);
};

var HttpGet = {};

HttpGet.static = function(request, response) {
    fs.readFile(request.path,
    function (err, fileContents) {
        if (err)
            return httpNotFound(response);
        var type = mime.lookup(request.path);
        response.writeHead(200, {"Content-Type": type});
        response.end(fileContents);
        log.debug("Sending static file " + request.path + " of type " + type + ".");
    });
};

HttpGet.list = function(request, response) {
    fs.readdir(request.path, function(err, files) {
        if (err) 
            return httpInternalError(response);
        var html = "<!DOCTYPE HTML PUBLIC '-//W3C//DTD HTML 4.01//EN' 'http://www.w3.org/TR/html4/strict.dtd'>";
        html += "<html><head><title>Index of " + request.path.substring("public".length) + "</title>";
        html += "<meta http-equiv='Content-Type' content='text/html;charset=utf-8'></head>";
        html += "<body style='padding: 20px;'>";
        html += "<h1>Index of " + request.path.substring("public".length) + "</h1>";
        if (request.path[request.path.length - 1] != "/")
            request.path += "/";
        if (request.originalUrl[request.originalUrl.length - 1] != "/")
            request.originalUrl += "/";
        files.sort();
        for (var i in files) {
            var file = files[i];
            if (file.match(/.options$/) != null)
                continue;
            stat = fs.statSync(request.path + file);
            if (stat != undefined && stat.isDirectory())
                statType = "dir";
            else
                statType = "file";
            html += "<li><a class='" + statType + "' href='" + request.originalUrl + file + "'>" + file + "</a><br/>";
        }
        html += "</body></html>";
        response.writeHead(200, {"Content-Type": "text/html"});
        response.end(html);
    });
};

HttpGet.get = function(request, response) {
    fs.stat(request.path, function(err, stat) {
        log.debug("stat err" + err);
        if (stat != undefined && stat.isDirectory()) {
            log.debug("dir");
        } else {
            log.debug("file");
            fs.readFile(request.path, "utf8", function (err, fileContents) {
                var functionName = request.urls.query["jsonp"];
                var json = "";
                if (err) {
                    json = "'NOT FOUND'";
                    log.debug("Editing new file " + request.path + ".");
                } else {
                    json = JSON.stringify(Format.parse(fileContents));
                    log.debug("Sending jsonified file " + request.path + ".");
                }
                var js = functionName + "(" + json + ");";
                response.writeHead(200, {"Content-Type": "text/javascript"});
                response.end(js);
            });
        }
    });
};

HttpGet.getOptions = function(request, response) {
    fs.stat(request.path + ".options", function(err, stat) {
        if (err)
            return httpInternalError(response);
        if (stat != undefined && stat.isDirectory()) {
            log.debug("dir");
        } else {
            log.debug("file");
            fs.readFile(request.path + ".options", "utf8", function (err, fileContents) {
                var functionName = request.urls.query["jsonp"];
                var js = "";
                if (err) {
                    log.debug("Editing new file " + request.path + ".");
                    js = functionName + "(null);";
                } else {
                    js = functionName + "(" + fileContents + ");";
                    log.debug("Sending jsonified options file " + request.path + ".");
                }
                response.writeHead(200, {"Content-Type": "text/javascript"});
                response.end(js);
            });
        }
    });   
};

HttpGet.download = function(request, response) {
    fs.readFile(request.path, "utf8",
        function (err, fileContents) {
            if (err)
                return httpNotFound(response);
            response.writeHead(200, {"Content-Type": "text/text"});
            response.end(fileContents);
            log.debug("Sending data.");
        }
    );
};

HttpGet.poll = function(request, response) {
    log.debug("Polling...");
    fs.watchFile(request.path, { persistent: true, interval: 1000 }, function (curr, prev) {
        log.debug("File changed!");
        HttpGet.get(request, response);
    });
};

HttpGet.set = function(request, response) {
    var fileContents = request.urls.query["data"];
    var data = Format.parse(fileContents);
    var functionName = request.urls.query["jsonp"];
    if (!Model.verify(data)) {
        var json = JSON.stringify("Error: The data you sent me in the HTTP POST request is malformed. Accepted format: k1,v1 \\n k2,v2 \\n ...\n");
        var js = functionName + "(" + json + ");";
        response.writeHead(200, {"Content-Type": "text/javascript"});
        response.end(js);
        return;
    }
    log.debug("Path: " + request.path);
    createFullPath(request.path, function(err) {
        if (err) {
            log.debug("Create path failed. Reason: " + err);
            var json = JSON.stringify("Error: Create path failed. Reason: " + err);
            var js = functionName + "(" + json + ");";
            response.writeHead(200, {"Content-Type": "text/javascript"});
            response.end(js);
            return;
        }
        fileContents = Format.serialize(data);
        fs.writeFile(request.path, fileContents, function(err) {
            if (err) {
                log.debug("File write failed. Reason: " + err);
                var json = JSON.stringify("Error: File write failed. Reason: " + err);
                var js = functionName + "(" + json + ");";
                response.writeHead(200, {"Content-Type": "text/javascript"});
                response.end(js);
                return;
            }
            var json = JSON.stringify("OK");
            var js = functionName + "(" + json + ");";
            response.writeHead(200, {"Content-Type": "text/javascript"});
            response.end(js);
        });
    });
};

HttpGet.delete = function(request, response) {
    // check to make sure the file exists
    fs.stat(request.path, function(err, stat) {
        if (err) {
            return httpNotFound(response);
        } else {
            fs.unlink(request.path, function (err) {
                if (err) {
                    log.debug("File delete failed at " + request.path + ", reason: " + err);
                    response.writeHead(500, {"Content-Type": "text/text"});
                    response.end("File delete failed, reason: " +  err + ".\n");
                } else {
                    log.debug("Deleted " + request.path);
                    response.writeHead(200, {"Content-Type": "text/text"});
                    response.end("File deleted.\n");                        
                }
            });
        }
    });        
};

HttpGet.default = function(request, response) {
    fs.stat(request.path, function(err, stat) {
        if (err || !stat.isDirectory()) {
            // browser is requesting the ajax client application
            request.path = "static/client.html";
            HttpGet.static(request, response);
        } else {
            // list directory
            HttpGet.list(request, response);
        }
    });
};

//
// ===============================================
//
//                  HttpPost
//
// ===============================================
//

var HttpPost = {};

HttpPost.update = function(request, response) {
    var updateData = Format.parse(request.postData);
    if (!Model.verify(updateData)) {
        response.writeHead(400, {"Content-Type": "text/text"});
        response.end("The data you sent me in the HTTP POST request is malformed. Accepted format: k1,v1 \\n k2,v2 \\n ...\n");
        return;
    }
    log.debug("Updating data at " + request.path + " with " + utils.inspect(updateData));
    createFullPath(request.path, function(err) {
        if (err) {
            log.debug("Create path failed. Reason: " + err);
            var json = JSON.stringify("Error: Create path failed. Reason: " + err);
            var js = functionName + "(" + json + ");";
            response.writeHead(200, {"Content-Type": "text/javascript"});
            response.end(js);
            return;
        }
        fs.readFile(request.path, "utf8", function (err, fileContents) {
            try {
                var newFileContents = "";
                if (err) {
                    newFileContents = Format.serialize(updateData);
                } else {
                    var data = Format.parse(fileContents);
                    Model.patch(data, updateData);
                    newFileContents = Format.serialize(data);
                }
                fs.writeFile(request.path, newFileContents, function(err) {
                    if (err) {
                        log.debug("File write failed. Reason: " + err);
                        response.writeHead(500, {"Content-Type": "text/text"});
                        response.end("File write failed. Reason: " + err + "\n");
                    } else {
                        response.writeHead(200, {"Content-Type": "text/text"});
                        response.end("File written.\n");
                        log.info("user_activity " + request.path.split("/")[1]);
                    }
                });
            } catch(err) {
                log.debug(err);
            }
        });
    });
};

HttpPost.set = function(request, response) {
    var data = Format.parse(request.postData);
    log.debug(data);
    if (!Model.verify(data)) {
        response.writeHead(400, {"Content-Type": "text/text"});
        response.end("The data you sent me in the HTTP POST request is malformed. Accepted format: k1,v1 \\n k2,v2 \\n ...\n");
        return;
    }

    log.debug("Path: " + request.path);
    createFullPath(request.path, function(err) {
        if (err) {
            log.debug("Create path failed. Reason: " + err);
            var json = JSON.stringify("Error: Create path failed. Reason: " + err);
            var js = functionName + "(" + json + ");";
            response.writeHead(200, {"Content-Type": "text/javascript"});
            response.end(js);
            return;
        }
        fileContents = Format.serialize(data);
        fs.writeFile(request.path, fileContents, function(err) {
            if (err) {
                log.debug("File write failed. Reason: " + err);
                response.writeHead(500, {"Content-Type": "text/text"});
                response.end("File write failed. Reason: " + err + "\n");
            } else {
                response.writeHead(200, {"Content-Type": "text/text"});
                response.end("File written.\n");
                log.info("user_activity " + request.path.split("/")[1]);
            }
        });
    });
};

HttpPost.setOptions = function(request, response) {
    var path = request.path + ".options";
    log.debug("Path: " + path);
    createFullPath(path, function(err) {
        if (err) {
            log.debug("Create path failed. Reason: " + err);
            var json = JSON.stringify("Error: Create path failed. Reason: " + err);
            var js = functionName + "(" + json + ");";
            response.writeHead(200, {"Content-Type": "text/javascript"});
            response.end(js);
            return;
        }
        fs.writeFile(path, request.postData, function(err) {
            if (err) {
                log.debug("File write failed. Reason: " + err);
                response.writeHead(500, {"Content-Type": "text/text"});
                response.end("File write failed. Reason: " + err + "\n");
            } else {
                response.writeHead(200, {"Content-Type": "text/text"});
                response.end("Options written.\n");
            }
        });
    });
};

HttpPost.default = function(request, response) {
    response.writeHead(500, {"Content-Type": "text/text"});
    response.end("Specify set or update in the URL (POST)!\n");
};

function getUsername(cookie) {
    var prefix = "authtoken=\"";
    var begin = cookie.indexOf(prefix);
    if (begin < 0)
        return;
    begin += prefix.length;
    var end = cookie.indexOf("-staff-", begin);
    if (end < 0)
        return;
    var username = cookie.substring(begin, end);
    return username;
}

function logUsername(request) {
    try {
        if (!request.headers["cookie"])
            return;
        var username = getUsername(request.headers["cookie"]);
        log.info("request from user " + username);
    } catch(err) { }
}

function dropToUser(username) {
    var pwnam = posix.getpwnam(username);
    posix.setgid(pwnam.gid);
    posix.setuid(pwnam.uid);
}

//
// ===============================================
//
//                  Main
//
// ===============================================
//

var log = logger.create();

if (process.argv.length != 3) {
    console.log("node plotserver.js <configuration_file>");
    process.exit(1);
}

var configFile = process.argv[2];
var config = require("./" + configFile);

if ("godAuth" in config.settings)
    var secrets = require("./config/secrets");

if (config.settings.log.console)
    log.addEndpoint(logger.endpoints.console(config.settings.log.console));
if (config.settings.log.dailyLogFile)
    log.addEndpoint(logger.endpoints.dailyLogFile(config.settings.log.dailyLogFile));
if (config.settings.log.scribe)
    log.addEndpoint(logger.endpoints.scribe(config.settings.log.scribe));

var port = config.settings.httpPort;
if ("https" in config.settings && config.settings.https.redirectHttp) {
    // Redirect to https
    console.log('Setting up HTTP to HTTPS redirect');
    http.createServer(function (req, res) {
        res.writeHead(301, {'Location': config.settings.urlBase});
        res.end("<a href='" + config.settings.urlBase + "'>" + config.settings.urlBase + "</a>");
    }).listen(config.settings.httpPort);
    port = config.settings.https.port;
}

var serverSettings = {
    "removeTrailingSlashes": true,
    "catchExceptions": true,
    "port": port,
    "logger": log,
    "url" : config.settings.url
};

if ("https" in config.settings && "options" in config.settings.https){
    serverSettings.httpsOptions = config.settings.https.options;
}

if ("godAuth" in config.settings) {
    serverSettings.godAuth = config.settings.godAuth;
    serverSettings.godAuth.secret = secrets.godAuthSecret;
    serverSettings.godAuth.bypassUsername = secrets.godAuthBypassUsername;
    serverSettings.godAuth.bypassPassword = secrets.godAuthBypassPassword;
}

console.log('Launching HTTP(S) server on port ' + port);
var server = new httpserver.create(serverSettings);

// rewrite rules
server.addUrlRewrite(  new RegExp("^$") /* empty string */,    function(path) { return "/static/index.html" });
server.addUrlRewrite(  new RegExp("^/static/.+"),              function(path) { return path; });
server.addUrlRewrite(  new RegExp("")   /* otherwise */,       function(path) { return "/public" + path; });
// get routes
server.addGetHandler(  new RegExp("^/static/.+", "i"),         HttpGet.static);
server.addGetHandler(  new RegExp("^.+\\?getOptions", "i"),    HttpGet.getOptions);
server.addGetHandler(  new RegExp("^.+\\?get", "i"),           HttpGet.get);
server.addGetHandler(  new RegExp("^.+\\?download", "i"),      HttpGet.download);
server.addGetHandler(  new RegExp("^.+\\?poll", "i"),          HttpGet.poll);
server.addGetHandler(  new RegExp("^.+\\?set", "i"),           HttpGet.set);
server.addGetHandler(  new RegExp("^.+\\?delete", "i"),        HttpGet.delete);
server.addDefaultGetHandler(                                   HttpGet.default);
// post routes
server.addPostHandler( new RegExp("^.+\\?setOptions", "i"),    HttpPost.setOptions);
server.addPostHandler( new RegExp("^.+\\?set", "i"),           HttpPost.set);
server.addPostHandler( new RegExp("^.+\\?update", "i"),        HttpPost.update);
server.addDefaultPostHandler(                                  HttpPost.default);
// request logger
server.addGetLogger(logUsername);
server.addPostLogger(logUsername);
// run
server.run();

if ("dropToUser" in config.settings)
    dropToUser(config.settings.dropToUser);
