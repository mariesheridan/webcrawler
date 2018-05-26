var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

module.exports = {
    crawl: function (url, depth, includeAssets, callback) {
        request(url, function(error, response, html){
            console.log('request callback');
            var json = {
                links:[]
            };

            if(!error) {
                var $ = cheerio.load(html);

                $('a').each(function(){
                    var href = $(this).attr('href');
                    json.links.push(href);
                });
            } else {
                console.log('Error: ' + error);
            }

            fs.writeFile(
                'output.json',
                JSON.stringify(json, null, 4),
                function(err){
                    console.log('File successfully written! - Check your project directory for the output.json file');
                    callback();
                }
            );
        });
    }
};
