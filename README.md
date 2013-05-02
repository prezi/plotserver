# Plotserver
============

## In 20 words or less?

Plotserver is a node.js application for easy plotting of timeseries and other simple XY data.

## Installation
---

You will need a working node.js installation and git:

```bash
git clone git@github.com:prezi/plotserver.git
cd plotserver
npm install
node plotserver.js config/test.js
# open http://localhost:9090 in your browser
```

## Detailed Description

At Prezi, we generate a large amount of log data every day, and derive valuable company and product metrics.
We use a variety of tools to plot and share these charts, Plotserver is the most popular of these with our engineers.

### What problem does it solve?

Let's say you have some simple CSV (comma seperated values) data, like

    2013-01-01, 1
    2013-01-02, 4
    2013-01-03, 9
    2013-01-04, 16
    2013-01-05, 25

You just want to quickly visualize it, and then share with some of your co-workers. Plotserver to the rescue!

Just open `http://HOSTNAME/yourname/dataset`, copy and paste your data, and the chart appears!

![Plotserver screenshot](https://raw.github.com/prezi/plotserver/master/img/screenshot.png)

The dataset (file) is automatically created when you click `Save` in the browser.
Optionally set the options to prettify the chart, and send the URL over to your buddies.
Done!

You can also send and retrieve data from Plotserver using a command line tool, conveniently called `plotserver`.
The command line is in the `cli` directory:

```bash
# above example from the command line
$ cat <<EOF | cli/plotserver set "http://HOSTNAME/yourname/dataset"
2013-01-01, 1
2013-01-02, 4
2013-01-03, 9
2013-01-04, 16
2013-01-05, 25
EOF
# verify it was written
$ cli/plotserver cat "http://HOSTNAME/yourname/dataset"
```

## How do we use Plotserver at Prezi?

We mostly use Plotserver for displaying auto-generated timeseries data.
One example is our data warehouse, which sends new data points to Plotserver every night, such as how many users registered that day on prezi.com, or how many prezis were created that day.

## Details

The node application stores the data in the `public` folder in CSV files. At Prezi we have a cronjob which pushes any changes here to a github repository, so we get free versioning of our datasets.
To set server options, see the `config` folder's `test.js` and `production.js` examples. You can add custom loggers in `logger.js`.
The client has a few settings, these can be found in `static/config.js`.
The cli tool has a conveniance feature: if you set `$PLOTSERVER_HOST`, then you can just specify the path part of your datasets when using it. For example:

```bash
# above example from the command line
$ export PLOTSERVER_HOST="http://HOSTNAME/"
$ cat <<EOF | cli/plotserver set "yourname/dataset"
2013-01-01, 1
2013-01-02, 4
2013-01-03, 9
2013-01-04, 16
2013-01-05, 25
EOF
# verify it was written
$ cli/plotserver cat "yourname/dataset"
```

Additionally, you can specify `$PLOTSERVER_CURL_OPTIONS`, these will be passed to curl as-is.

## Contributing

Send git pull requests to our github repo :)

Todos and ideas:
- refactor client.html
- prettify the client
- replace Google charts with d3.js
- add support for dashboards
- add support for large datasets
- add Mysql backend

Happy hacking!

# License

Plotserver is released under the [MIT License](http://opensource.org/licenses/MIT).
