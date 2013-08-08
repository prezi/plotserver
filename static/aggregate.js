//
// ===============================================
//
//                  Aggregate
//
// ===============================================
//
Aggregate =
{
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
        var sum = Aggregate.sum(arr);
        var avg = sum / arr.length;
        return avg;
    },

    median: function(arr) {
        if (arr.length == 0)
            return 0;
        return parseFloat(arr[Math.floor(arr.length/2)]);
    }
}
