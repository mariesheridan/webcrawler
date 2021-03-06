var express = require('express');
var crawler = require('./js/crawler');
var app = express();

app.get('/crawl', function(req, res){

    url = req.query.url || "http://www.google.com";
    depth = req.query.depth || 2;
    includeAssets = req.query.assets || false;

    console.log('starting crawl...');
    console.log('url           : ' + url);
    console.log('depth         : ' + depth);
    console.log('include assets: ' + includeAssets);

    crawler.crawl(
        url,
        depth,
        includeAssets,
        function(filename){
            res.download(filename);
        }
    );
});

var port = process.env.PORT || 8888;
app.listen(port);

console.log('App is listening to port: ' + port);

exports = module.exports = app;
