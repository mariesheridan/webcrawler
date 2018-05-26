var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');

var visitedLinks = [];

module.exports = {
    crawl: function (url, depth, includeAssets, callback) {
        var level = 1;
        crawlThisLevel(level, [url], [url], url, depth, includeAssets, function(urlList) {
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

var crawlThisLevel = function(level, totalURLList, levelURLList, baseURL, depth, includeAssets, callback) {

    console.log("Level " + level + " of " + depth);
    var numOfURL = levelURLList.length;
    var index = 0;

    getLinks(levelURLList, baseURL, index, numOfURL, includeAssets, function(newUrlList) {
        if (level < depth) {
            totalURLList = newUrlList.reduce(addNonExistingURL, totalURLList);
            crawlThisLevel(level + 1, totalURLList, newUrlList, baseURL, depth, includeAssets, callback);
        } else {
            callback(newUrlList);
        }
    });
}

var getLinks = function(urlList, baseURL, index, numOfURL, includeAssets, callback) {

    getLinksFromURL(urlList, baseURL, index, includeAssets, function(newURLList) {
        if (index < (numOfURL - 1)) {
            getLinks(newURLList, baseURL, index + 1, numOfURL, includeAssets, callback);
        } else {
            callback(newURLList);
        }
    });
}

var getLinksFromURL = function(urlList, baseURL, index, includeAssets, callback) {

    request(urlList[index], function(error, response, html) {
        console.log('====> request callback : ' + urlList[index]);

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
                baseURL: baseURL
            };
            var newState = list.reduce(sanitizeURLs, initialState);
            console.log(urlList.length);
            resultList = urlList.concat(newState.urlList);
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

/**
 * Checks if the link is external.
 * Example:
 * "//cdn.optimizely.com/js/3316040336.js"
 * "https://cdn.kikki-k.com/media/favicon/default/favicon.ico"
 */
var isExternalLink = function(link) {
    var result = false;
    if (link) {
        var pattern = /\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
        result = link.match(pattern);
    }
    return result;
}

/**
 * Checks if link is relative to the base URL
 * Example:
 * "/endpoint1/endpoint2"
 */
var isInternalLinkFromBaseURL = function(link) {
    var result = false;
    if (link) {
        var pattern = /^\/[^\/].*/g;
        result = link.match(pattern);
    }
    return result;
}

var addNonExistingURL = function(totalList, url) {
    if (!totalList.includes(url)) {
        totalList.push(url);
    }
    return totalList;
}
