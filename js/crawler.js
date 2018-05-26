var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

module.exports = {
    crawl: function (url, depth, includeAssets, callback) {
        request(url, function(error, response, html){
            console.log('request callback');
            if(!error) {
                console.log('No error!');
                var $ = cheerio.load(html);

                var href = $('a').first().attr('href');

                console.log('href = ' + href);
            } else {
                console.log('Error: ' + error);
            }

            callback();
        });
    }
};
