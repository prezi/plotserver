var settings = {};

settings.log = {};
settings.log.console = {"level": "info"};
settings.log.dailyLogFile = {"level": "info", "directory": "/var/log/plotserver", "file": "plotserver"};
settings.log.scribe = {"level": "info", "host": "localhost", "port": 1463, "category": "plotserver"};

settings.urlBase = "https://plot.prezi.com/";
settings.httpPort = 80;

settings.https = {};
settings.https.options = { "key": "/etc/ssl/private/*.prezi.com.key", "cert": "/etc/ssl/private/*.prezi.com.crt" };
settings.https.port = 443;
settings.https.redirectHttp = true;

settings.godAuth = { "url": settings.urlBase };

settings.dropToUser = "publisher";

module.exports.settings = settings;
