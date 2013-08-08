
//
// ===============================================
//
//                  Util
//
// ===============================================
//
Util =
{
    createFullPath: function(fullPath, callback) {
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
    },

    toYearWeek: function(d) {
        // Copy date so don't modify original
        d = new Date(d);
        d.setHours(0,0,0);
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setDate(d.getDate() + 4 - (d.getDay()||7));
        // Get first day of year
        var yearStart = new Date(d.getFullYear(),0,1);
        // Calculate full weeks to nearest Thursday
        var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7)
        // Return array of year and week number
        if (weekNo < 10)
            weekNo = "0" + weekNo;
        return d.getFullYear() + " week " + weekNo;
    },

    toYearMonth: function(d) {
        d = new Date(d);
        var month = new Array();
        //var n = month[d.getMonth()]; 
        //return d.getFullYear() + " " + n;
        if (d.getMonth() + 1 < 10)
            return d.getFullYear() + "-0" + (d.getMonth()+1);
        else
            return d.getFullYear() + "-" + (d.getMonth()+1);
    },

    toYear: function(d) {
        d = new Date(d);
        return "Year "  + d.getFullYear();
    },

    id: function(x) {
        return x;
    },

    count: function(arr) {
        return arr.length;
    },

    min: function(arr) {
        return Math.min.apply( Math, arr );
    },

    max: function(arr) {
        return Math.max.apply( Math, arr );
    },

    sum: function(arr) {
        var sum = 0;
        for (var i = 0;  i < arr.length; i++) {
            sum += parseFloat(arr[i]);
        }
        return sum;
    },

    avg: function(arr) {
        var sum = Util.sum(arr);
        var avg = sum / arr.length;
        return avg;
    },

    median: function(arr) {
        if (arr.length == 0)
            return 0;
        return parseFloat(arr[Math.floor(arr.length/2)]);
    }
}

//
// ===============================================
//
//                  Format
//
// ===============================================
//
Format =
{
    separator: ",",

    parse: function(str)  {
        var data = {};
        var lines = str.split('\n');
        lines.forEach(function (line) {
            if (line.length == 0)
                return; // skip empty lines
            var values = line.split(Format.separator);
            for (var i = 0; i < values.length; i++) {
                if (!(i in data))
                    data[i] = []
                data[i].push(values[i].trim());
            }
        });
        return data;
    },

    toRowColArray: function(data) {
        newData = [];
        for (var i = 0; i < data[0].length; i++) {
            var row = [];
            for (var j = 0; j < Object.keys(data).length; j++)
                row.push(data[j][i]);
            newData.push(row);
        }
        return newData;
    },

    sortRowColArrayAsc: function(data) {
        return data.sort( function(a, b) {
            if (a[0] > b[0])
                return 1;
            else if (a[0] < b[0])
                return -1;
            else
                return 0;
        } );
    },

    floatSortRowColArrayAsc: function(data) {
        return data.sort( function(a, b) {
            if (parseFloat(a[0]) > parseFloat(b[0]))
                return 1;
            else if (parseFloat(a[0]) < parseFloat(b[0]))
                return -1;
            else
                return 0;
        } );
    },

    serializeRowColArray: function(data) {
        var str = "";
        for (var i = 0, max = data.length; i < max; i++) {
            str += data[i].join() + '\n';
        }
        return str;        
    },

    serialize: function(data) {
        try {      return Format.serializeRowColArray(Format.floatSortRowColArrayAsc(Format.toRowColArray(data))); }
        catch(e) { return Format.serializeRowColArray(Format.sortRowColArrayAsc(Format.toRowColArray(data))); }
    }
};

//
// ===============================================
//
//                  Model
//
// ===============================================
//
Model =
{
    verify: function(data) {
        if (!data[0] || !data[1])
            return false;
        var len = null;
        for (var key in data) {
            if (len == null)
                len = data[key].length;
            else if (data[key].length != len)
                return false;
        }
        if (len == null)
            return false;
        return true;
    },

    patch: function(data, updateData) {
        try {
            for (var i = 0; i < updateData[0].length; i++) {
                var key = updateData[0][i];
                var found = false;
                for (var j = 0; j < data[0].length; j++) {
                    if (key == data[0][j]) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    for (var k = 1; k < Object.keys(updateData).length; k++)
                        data[k][j] = updateData[k][0];
                } else {
                    for (var k = 0; k < Object.keys(updateData).length; k++)
                        data[k].push(updateData[k][0]);
                }
            }
        } catch(err) { }
    }
};

try { global.Util = Util } catch(error) { }
try { global.Model = Model } catch(error) { }
try { global.Format = Format } catch(error) { }
