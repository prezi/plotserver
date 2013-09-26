var settings = {};
settings.log = {};
settings.log.console =      {"level": "info"};
settings.log.dailyLogFile = {"level": "info", "directory": "/var/log/plotserver", "file": "plotserver"};
settings.log.scribe =       {"level": "info", "host": "localhost", "port": 1463, "category": "plotserver"};

module.exports.settings = settings;
