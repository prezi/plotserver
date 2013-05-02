
//
// ===============================================
//
//                  Util
//
// ===============================================
//
Util =
{
    keys: function(obj) {
        var keys = [];
        for(var i in obj)
        {
            if (obj.hasOwnProperty(i))
                keys.push(i);
        }
        return keys;
    },

    trim: function(str) {
        return str.replace(/^\s+|\s+$/g,'');
    },

    length: function(obj) {
        var size = 0, key;
        for (key in obj)
            if (obj.hasOwnProperty(key)) size++;
        return size;
    },

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

    clone: function(item) {
        if (!item) { return item; } // null, undefined values check
        var types = [ Number, String, Boolean ], 
            result;
        // normalizing primitives if someone did new String('aaa'), or new Number('444');
        types.forEach(function(type) {
            if (item instanceof type) {
                result = type( item );
            }
        });
        if (typeof result == "undefined") {
            if (Object.prototype.toString.call( item ) === "[object Array]") {
                result = [];
                item.forEach(function(child, index, array) { 
                    result[index] = Util.clone( child );
                });
            } else if (typeof item == "object") {
                // testign that this is DOM
                if (item.nodeType && typeof item.cloneNode == "function") {
                    var result = item.cloneNode( true );    
                } else if (!item.prototype) { // check that this is a literal
                    // it is an object literal
                    result = {};
                    for (var i in item) {
                        result[i] = Util.clone( item[i] );
                    }
                } else {
                    // depending what you would like here,
                    // just keep the reference, or create new object
                    if (false && item.constructor) {
                        // would not advice to do that, reason? Read below
                        result = new item.constructor();
                    } else {
                        result = item;
                    }
                }
            } else {
                result = item;
            }
        }
        return result;
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
                data[i].push(Util.trim(values[i]));
            }
        });
        return data;
    },

    toRowColArray: function(data) {
        newData = [];
        for (var i = 0; i < data[0].length; i++) {
            var row = [];
            for (var j = 0; j < Util.length(data); j++)
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

    patch: function(oldData, updateData) {
        var newData = Util.clone(oldData);
        try {
            for (var i = 0; i < updateData[0].length; i++) {
                var key = updateData[0][i];
                var found = false;
                for (var j = 0; j < newData[0].length; j++) {
                    if (key == newData[0][j]) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    for (var k = 1; k < Util.length(updateData); k++)
                        newData[k][j] = updateData[k][0];
                } else {
                    for (var k = 0; k < Util.length(updateData); k++)
                        newData[k].push(updateData[k][0]);
                }
            }
        } catch(err) { }
        return newData;
    }
};

//
// ===============================================
//
//                  Base64
//
// ===============================================
//
Base64 =
{
    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
 
    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = Base64._utf8_encode(input);
 
        while (i < input.length) {
 
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
 
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
 
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
 
            output = output +
            this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
            this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
 
        }
 
        return output;
    },
 
    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
 
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
        while (i < input.length) {
 
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));
 
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
 
            output = output + String.fromCharCode(chr1);
 
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
 
        }
 
        output = Base64._utf8_decode(output);
 
        return output;
 
    },
 
    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
 
        for (var n = 0; n < string.length; n++) {
 
            var c = string.charCodeAt(n);
 
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
 
        }
 
        return utftext;
    },
 
    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
 
        while ( i < utftext.length ) {
 
            c = utftext.charCodeAt(i);
 
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
 
        }
 
        return string;
    }
}

String.prototype.endsWith = function(suffix)
{
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

try { global.Util = Util } catch(error) { }
try { global.Model = Model } catch(error) { }
try { global.Format = Format } catch(error) { }
try { global.Base64 = Base64 } catch(error) { }
