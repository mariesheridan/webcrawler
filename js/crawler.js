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

        var iteration = 1;

        getLinks(url, includeAssets, function(links) {

            fs.writeFile(
                'output.json',
                JSON.stringify(json, null, 4),
                function(err) {
                    console.log('File successfully written! - Check your project directory for the output.json file');
                    callback();
                }
            );
        });
    }
};

var getLinks = function(url, includeAssets, callback) {

    request(url, function(error, response, html) {

        console.log('request callback');

        if(!error) {
            var $ = cheerio.load(html);

            $('a').each(function(){
                var href = $(this).attr('href');
                json.hrefs.push(href);
            });

            $('script').each(function(){
                var script = $(this).attr('src');
                var script = $(this).html();
                json.scripts.push(script);
            });

            $('link').each(function(){
                var link = $(this).attr('href');
                json.links.push(link);
            });
        } else {
            console.log('Error: ' + error);
        }

        callback();
    });
}
