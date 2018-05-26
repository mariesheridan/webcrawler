var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var visitedLinks = [];
var json = {
    hrefs: [],
    links :[],
    scripts: []
};

module.exports = {
    crawl: function (url, depth, includeAssets, callback) {

        var level = 1;

        visitURLs([url], level, depth, includeAssets, function(urlList) {

            fs.writeFile(
                'output.json',
                JSON.stringify(urlList, null, 4),
                function(err) {
                    console.log('File successfully written! - Check your project directory for the output.json file');
                    callback();
                }
            );
        });
    }
};

var visitURLs = function(urlList, level, depth, includeAssets, callback) {

    console.log("Level " + level + " of " + depth);
    var numOfURL = urlList.length;
    var index = 0;

    getLinks(urlList, index, includeAssets, function(newUrlList) {
        if (level < depth) {
            visitURLs(newUrlList, level + 1, depth, includeAssets, callback)
        } else {
            callback(newUrlList);
        }
    });
}

var getLinks = function(urlList, index, includeAssets, callback) {

    request(urlList[index], function(error, response, html) {
        var list = urlList;

        console.log('request callback');

        if(!error) {
            var $ = cheerio.load(html);

            $('a').each(function(){
                var href = $(this).attr('href');
                list.push(href);
            });

            $('script').each(function(){
                var script = $(this).attr('src');
                // var script = $(this).html();
                list.push(script);
            });

            $('link').each(function(){
                var link = $(this).attr('href');
                list.push(link);
            });
        } else {
            console.log('Error: ' + error);
        }

        callback(list);
    });
}
