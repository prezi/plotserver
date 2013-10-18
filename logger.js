var fs = require("fs");
var dateformat = require("./dateformat");
var scribe = require('scribe').Scribe;

//
// ===============================================
//
//                  Logger
//
// ===============================================
//

var Logger = function() {
    // public:
    this.addEndpoint = function(endpoint) {
        _endpoints.push(endpoint);
    };

    this.error = function(message) {
        _log("error", message);
    };

    this.warn = function(message) {
        _log("warn", message);
    };

    this.info = function(message) {
        _log("info", message);
    };

    this.debug = function(message) {
        _log("debug", message);
    };

    // private:
    var _log = function(level, message) {
        var now, i, max;
        for (i = 0, max = _endpoints.length; i < max; i += 1) {
            var endpoint = _endpoints[i];
            endpoint.log(new Date(), level, message);
        }
    }

    var _endpoints = [];
};

Logger.levelMap = {"error": 0, "warn": 1, "info": 2, "debug": 3};

module.exports.create = function() {
    return new Logger();
};

module.exports.endpoints = {};

//
// ===============================================
//
//                  Console logger
//
// ===============================================
//

module.exports.endpoints.console = function(settings) {
    var _settings = settings;

    return new function() {
        this.log = function(date, level, message) {
            if (Logger.levelMap[level] <= Logger.levelMap[_settings["level"]]) {
                var line = date.format("yyyy-mm-dd HH:MM:ss") + " " + level.toUpperCase() + " " + message;
                console.log(line);
            }
        }
    }
};

//
// ===============================================
//
//                  Daily file logger
//
// ===============================================
//

module.exports.endpoints.dailyLogFile = function(settings) {
    var _settings = settings;
    var _previousFile = "";

    var _symlink = function(file) {
        var symlink = settings.directory + "/" + settings.file + "_current";
        if (file != _previousFile) {
            fs.unlink(symlink);
            fs.symlink(file, symlink);
            _previousFile = file;
        }
    }
    
    return new function() {
        this.log = function(date, level, message) {
            if (Logger.levelMap[level] <= Logger.levelMap[_settings["level"]]) {
                var file = settings.file + "-" + date.format("yyyy-mm-dd");
                var line = date.format("yyyy-mm-dd HH:MM:ss") + " " + level.toUpperCase() + " " + message + "\n";
                fs.appendFile(settings.directory + "/" + file, line, function (err) {});
                _symlink(file);
            }
        }
    }
};

//
// ===============================================
//
//                  Scribe logger
//
// ===============================================
//

module.exports.endpoints.scribe = function(settings) {
    var _settings = settings;
    var _client = new scribe(settings["host"], settings["port"], { autoReconnect:true });
        _client.open( function() {} );
    
    return new function() {
        this.log = function(date, level, message) {
            if (Logger.levelMap[level] <= Logger.levelMap[_settings["level"]]) {
                var line = date.format("yyyy-mm-dd HH:MM:ss") + " " + level.toUpperCase() + " " + message + "\n";
                _client.send(_settings["category"], line);
            }
        }
    }
};
