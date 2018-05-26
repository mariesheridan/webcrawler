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
        console.log('request callback');

        var resultList = urlList;

        if(!error) {
            var $ = cheerio.load(html);
            var list = [];

            $('a').each(function(){
                var href = $(this).attr('href');
                list.push(href);
            });

            $('script').each(function(){
                var script = $(this).attr('src');
                list.push(script);
            });

            $('link').each(function(){
                var link = $(this).attr('href');
                list.push(link);
            });

            var initialState = {
                urlList: urlList,
                currentURL: urlList[index],
                baseURL: urlList[0]
            };
            var newState = list.reduce(sanitizeURLs, initialState);
            resultList = newState.urlList;
        } else {
            console.log('Error: ' + error);
        }

        callback(resultList);
    });
}

var sanitizeURLs = function(currentState, url) {
    if (isExternalLink(url)) {
        var list = currentState.urlList;
        if (!list.includes(url)) {
            currentState.urlList.push(url);
        }
    } else if(isInternalLinkFromBaseURL(url)) {
        var completeURL = currentState.baseURL + url;
        var list = currentState.urlList;
        if (!list.includes(completeURL)) {
            currentState.urlList.push(completeURL);
        }
    }
    return currentState;
}

var isExternalLink = function(link) {
    var result = false;
    if (link) {
        var pattern = /\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
        result = link.match(pattern);
    }
    return result;
}

var isInternalLinkFromBaseURL = function(link) {
    var result = false;
    if (link) {
        var pattern = /^\/[^\/].*/g;
        result = link.match(pattern);
    }
    return result;
}
