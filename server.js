var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();

app.get('/crawl', function(req, res){

    console.log("crawl hit!");
    url = 'https://www.kikki-k.com/blog/';

    request(url, function(error, response, html){
        console.log('request callback');
        if(!error) {
            console.log("No error!");
            var $ = cheerio.load(html);

            var href = $('a').first().attr('href');

            console.log("href = " + href);
        } else {
            console.log("Error: " + error);
        }

        res.send('Check your console!')
    });
})

app.listen('8081')

console.log('Magic happens on port 8081');

exports = module.exports = app;
