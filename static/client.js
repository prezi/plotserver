
var options = {fontName: "georgia", lineWidth: 2, pointSize: 3, colors: ["blue"], curveType: "function", lines: ["Some data"], title: "Some title"};
var lastData, lastAggregateData;
var charts = {};
var viewMode = false;

function baseURL() {
	return location.protocol + '//' + location.host + location.pathname;
}

function gaSSDSLoad (acct) {
	// from http://liveweb.archive.org/web/20121005211251/http://lyncd.com/2009/03/better-google-analytics-javascript/
	var gaJsHost = (("https:" == document.location.protocol) ? "https://ssl." : "http://www."),
	    pageTracker,
	    s;
	s = document.createElement('script');
	s.src = gaJsHost + 'google-analytics.com/ga.js';
	s.type = 'text/javascript';
	s.onloadDone = false;
	function init () {
	    pageTracker = _gat._getTracker(acct);
	    pageTracker._trackPageview();
	}
	s.onload = function () {
	    s.onloadDone = true;
	    init();
	};
	s.onreadystatechange = function() {
	    if (('loaded' === s.readyState || 'complete' === s.readyState) && !s.onloadDone) {
	        s.onloadDone = true;
	        init();
	    }
	};
	document.getElementsByTagName('head')[0].appendChild(s);
}

function urlParams() {
	if (typeof urlParamsReturnValue == 'undefined')
	{
	    var vars = {};
	    var parts = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	    for (var i = 0; i < parts.length; i++) {
	        if (parts[i].indexOf("=") >= 0) {
	            kv = parts[i].split('=');
	            vars[kv[0]] = decodeURIComponent(kv[1]);
	        } else {
	            if (parts[i].indexOf("http://") == 0 || parts[i].indexOf("https://") == 0)
	                continue;
	            vars[parts[i]] = true;
	        }
	    }
	    urlParamsReturnValue = vars;
	}
	return urlParamsReturnValue;
}

function init() {
    document.title = location.pathname.substring(1) + " - Plotserver";

	var chartConstructors = {
	    "lineChart":   function(e) { return new google.visualization.LineChart(e)   },
	    "columnChart": function(e) { return new google.visualization.ColumnChart(e) },
	    "areaChart":   function(e) { return new google.visualization.AreaChart(e)   },
	    "pieChart":    function(e) { return new google.visualization.PieChart(e)    }
	};

    for (var type in chartConstructors)
        charts[type] = chartConstructors[type](document.getElementById(type));

    setOptions();
    get();
    getOptions();
    setViewMode();
    if (Config.googleAnalyticsTrackingCode != "")
        gaSSDSLoad(Config.googleAnalyticsTrackingCode);
}

function toggleEditMode() {
    if ($("#editView").html() == "Edit plot") {
        $("#editContainer").show();
        $("#editView").html("Back to plot only");
    } else {
        $("#editContainer").hide();
        $("#editView").html("Edit plot")
	}
	draw(lastData);
}

function aggregate(data) {
    var aggregateFunc = Aggregate.id;
    if (options["group"] == "week")
        aggregateFunc = Aggregate.toYearWeek;
    else if (options["group"] == "month")
        aggregateFunc = Aggregate.toYearMonth;
    else if (options["group"] == "year")
        aggregateFunc = Aggregate.toYear;

    var aggregate = {}; // aggregate => [[],[],[]...]
    for (var i = 0; i < data[0].length; i++) {
        for (var j = 0; j < Object.keys(data).length; j++) {
            var val = data[j][i];
            if (j == 0)
                key = aggregateFunc(val)
            else {
                var multiValues = aggregate[key] || []; // default is []
                var values = multiValues[j - 1] || []; // default is []
                values.push(val);
                multiValues[j - 1] = values;
                aggregate[key] = multiValues;
            }
        }
    }

    var metricFunc = null;
    if (options["metric"] == "count")
        metricFunc = Aggregate.count;
    else if (options["metric"] == "min")
        metricFunc = Aggregate.min;
    else if (options["metric"] == "max")
        metricFunc = Aggregate.max;
    else if (options["metric"] == "sum")
        metricFunc = Aggregate.sum;
    else if (options["metric"] == "avg")
        metricFunc = Aggregate.avg;
    else if (options["metric"] == "median")
        metricFunc = Aggregate.median;

    if (metricFunc == null)
        return;
    
    var sorted_keys = Object.keys(aggregate).sort()
    rows = []
    for (var i = 0; i < sorted_keys.length; i++) {
        var key = sorted_keys[i];
        row = []
        row.push(key);
        var multiValues = aggregate[key];
        for (var j = 0; j < multiValues.length; j++) {
            var values = multiValues[j];
            var metric = metricFunc(values);
            row.push(metric);
        }
        rows.push(row);
    }

    // convert to column format for draw()
    var columns = []
    for (var i = 0; i < rows[0].length; i++) {
        var column = [];
        for (var j = 0; j < rows.length; j++) {
            column.push(rows[j][i]);
        }
        columns.push(column);
    }

    return columns;
}

function onOptionsChanged() {
    try {
        var tryObj = eval('(' + document.getElementById("options").value + ')');
        options = tryObj;
        optionsText = document.getElementById("options").value;
        if (options["group"]) {
            lastAggregateData = aggregate(lastData);
            drawPlot(lastAggregateData);
        }
        else {
            drawPlot(lastData);
        }
    } catch (error) {
    	console.log(error)
    }
}

function setOptions() {
    optionsText = JSON.stringify(options, null, 4);
    document.getElementById("options").value = optionsText;
}

function get() {
    $.getJSON(baseURL() + "?get&jsonp=?", function(data) { onData(data); });
}

function getOptions() {
    $.getJSON(baseURL() + "?getOptions&jsonp=?", function(data) { onOptions(data); });
}

function poll() {
    $.getJSON(baseURL() + "?poll&jsonp=?", function(data) { onData(data); });
}

function onData(data) {
    if (data == "NOT FOUND") {
        toggleEditMode();
    } else {
        draw(data);
        lastData = data;
        if (Config.useLongPoll)
            setTimeout(function() { poll() }, 1*1000); // long poll for new data
    }
}

function onOptions(data) {
    if (data == null)
        return;
    optionsText = JSON.stringify(data, undefined, 2);
    document.getElementById("options").value = optionsText;
    onOptionsChanged();
}

function draw(data) {
    if ($("#editContainer").is(':hidden')) {
        $("#plotContainer").width(0.9 * $(window).width());
    } else {
        $("#plotContainer").width(0.45 * $(window).width());
        $("#editContainer").width(0.45 * $(window).width());
    }

    if (viewMode)
    {
        $("#plot").height($("#plotContainer").height());
        $("#viewContainer").height($(window).height());
        $("#plotContainer").height($(window).height());
        $("#plotContainer").width($(window).width());
    }
    else
    {
        $("#plotContainer").height(0.8 * $(window).height());
        $("#plot").height($("#plotContainer").height());
        $("#editContainer").height($("#viewContainer").height());
        $("#numbers").height($("#plotContainer").height() - $("#options").height() - 2); // magic number
        $("#optionsHelp").css("top", $("#options").height() * 1.1);
        $("#optionsHelp").css("right", 60);
        $("#numbersHelp").css("top", $("#numbers").position().top + $("#numbers").height() - 20);
        $("#numbersHelp").css("right", 60);
    }

    // ---

    if (data == undefined)
        return;

    document.getElementById("numbers").innerHTML = Format.serialize(data);

    if (options["group"]) {
        lastAggregateData = aggregate(data);
        drawPlot(lastAggregateData);
    }
    else {
        drawPlot(data);
    }
}

function drawPlot(data) {
	var chartTypes = {
	    "lineChart":   ["number", "date", "datetime", "string"],
	    "columnChart": ["number", "date", "datetime", "string"],
	    "areaChart":   ["number", "date", "datetime", "string"],
	    "pieChart":    ["string"]
	};

    for (var type in chartTypes)
        document.getElementById(type).style.display = "none";

    try {
        document.getElementById(options["chart"] + "Chart").style.display = "block";
    } catch(err) {
        document.getElementById("lineChart").style.display = "block";                    
    }

    if (options["chart"] == "area")
        options["isStacked"] = true;
    if (urlParams().hasOwnProperty("ratio")) {
        if (!options.hasOwnProperty("vAxis"))
            options["vAxis"] = {};
        options["vAxis"].format = "# '%'";
    }
    if (urlParams().hasOwnProperty("title"))
        options["title"] = urlParams()["title"];

    for (var type in chartTypes) {
        var xtypes = chartTypes[type];
        xtypes.map(function(xtype) {
            try {
                var dataTable = new google.visualization.DataTable();
                dataTable.addColumn(xtype, "x");
                for (var j = 0; j < Object.keys(data).length - 1; j++) {
                    if (options.lines[j] === undefined)
                        options.lines[j] = "Line " + (j + 1);
                    if (options.colors[j] === undefined)
                        options.colors[j] = ["blue", "green", "red", "purple", "black", "orange"][j];
                    dataTable.addColumn("number", options.lines[j]);
                }
                for (var i = 0; i < data[0].length; i++) {
                    var row = [];
                    var sum = 0;
                    for (var j = 0; j < Object.keys(data).length; j++) {
                        val = data[j][i];
                        if (j == 0) {
                            if (typeof val == "number")
                                ;
                            else if (val.indexOf("w") >= 0)
                                ; // weekly
                            else if (val.indexOf("-") > 0 && val.indexOf(" ") == -1)
                                ; // monthly
                            else if (val.indexOf("y") >= 0)
                                ; // yearly
                            else if (val.indexOf("-") > 0 || val.indexOf(" ") >= 0)
                                val = new Date(Date.parse(val));
                            else {
                                val = parseFloat(val);
                                if (urlParams().hasOwnProperty("ratio"))
                                    sum += val;
                            }
                        } else {
                            val = parseFloat(val);
                            if (urlParams().hasOwnProperty("ratio"))
                                sum += val;
                        }
                        if (type == "pieChart" && j == 0)
                            val = "" + data[j][i];
                        row.push(val);
                    }
                    if (urlParams().hasOwnProperty("ratio")) {
                        for (var j = 1; j < row.length; j++) {
                            row[j] /= sum;
                            row[j] *= 100;
                        }
                    }
                    dataTable.addRow(row);
                }
                charts[type].draw(dataTable, options);
            } catch(error) { console.log(error); }
        });
    }
}

function save(fileContents, optionsContents) {
    $("#save").html("Saving...");
    var data = Format.parse(fileContents);
    if (!Model.verify(data)) {
        alert("Error: The data you sent me in the HTTP POST request is malformed. Accepted format: k1,v1 \\n k2,v2 \\n ...\n");
        return;
    }
    $.post(baseURL() + "?set", fileContents, function(result) {
        result = result.trim();
        if (result == "File written.")
            saveOptions(optionsContents);
        else
            alert(result);
    }, "text")
}

function saveOptions(optionsContents) {
    try {
        eval('(' + optionsContents + ')')
    } catch(error) {
        alert("The options are not valid JSON.");
        return;
    }
    $.post(baseURL() + "?setOptions", optionsContents, function(result) {
        result = result.trim();
        if (result != "Options written.")
            alert(result);
    }, "text");
    $("#save").html("Saving... Done!");
    window.setInterval(function () { $("#save").html("Save") }, 500);
}

function onNumbersChanged(fileContents) {
    var data = Format.parse(fileContents);
    if (!Model.verify(data))
        return;
    lastData = data;
    var drawData = lastData;
    if (options["group"])
        drawData = lastAggregateData = aggregate(data);
    drawPlot(drawData);
}

function setViewMode() {
    if (urlParams().hasOwnProperty("view")) {
        viewMode = true;
        $("#viewAsImage").hide();
        $("#editView").hide();
        $("html").css("margin", "0");
        $("body").css("margin", "0");
        $("#viewContainer").css("height", "100%");
        $("#plotContainer").css("height", "100%");
        $("#plotContainer").css("margin", "0");
        $("#plotContainer").css("padding", "0");
        $("#plotContainer").css("border", "0");
        if (urlParams().hasOwnProperty("link")) {
            $("#viewContainer").append("<a class='downloadLink' target='top_' href='" + baseURL() + "?download'>data</a> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <a class='downloadLink' target='top_' href='" + baseURL() + "'>view</a>");
        }
        if (urlParams().hasOwnProperty("clickable")) {
            $("#viewContainer").click(function () {
                window.open(baseURL());
            });
        }
    }
}
