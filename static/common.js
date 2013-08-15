
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
        try {
            if (data[0][0].indexOf("-") != -1)
                throw "it's a date, not a float";
            else
                return Format.serializeRowColArray(Format.floatSortRowColArrayAsc(Format.toRowColArray(data)));
        } catch(e) {
            return Format.serializeRowColArray(Format.sortRowColArrayAsc(Format.toRowColArray(data)));
        }
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

try { global.Model = Model } catch(error) { }
try { global.Format = Format } catch(error) { }
