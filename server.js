var express = require('express');
var crawler = require('./js/crawler');
var app = express();

app.get('/crawl', function(req, res){

    console.log('crawl hit!');
    url = 'https://www.kikki-k.com/blog/';
    depth = 1;
    includeAssets = false;

    crawler.crawl(
        url,
        depth,
        includeAssets,
        function(){
            res.send('Finished crawling!')
        }
    );
});

var port = process.env.PORT || 8888;
app.listen(port);

console.log('App is listening to port: ' + port);

exports = module.exports = app;
