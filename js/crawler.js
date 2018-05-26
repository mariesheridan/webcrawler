var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var remoteFileSize = require('remote-file-size');

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
    var index = 0;

    getLinksForLevel(levelURLList, baseURL, includeAssets, function(levelOutput) {
        totalURLList = levelOutput.reduce(pushIfNotExisting, totalURLList);
        if (level < depth) {
            crawlThisLevel(level + 1, totalURLList, levelOutput, baseURL, depth, includeAssets, callback);
        } else {
            var fileURLList = totalURLList.filter(isFileURL);
            getFileSize(fileURLList, function(filesWithSizes){
                callback(filesWithSizes);
            });
        }
    });
}

var getLinksForLevel = function(urlList, baseURL, includeAssets, callback) {
    var promises = [];
    var numOfURL = urlList.length;
    for (var i = 0; i < numOfURL; i++) {
        var promise = new Promise(function(resolve, reject){
            console.log("---> Get link: " + urlList[i]);
            getLinksFromURL(urlList[i], baseURL, includeAssets, function(links) {
                resolve(links);
            });
        });
        promises.push(promise);
    }

    Promise.all(promises).then(function(listArray) {
        console.log("---- Merging lists ----");
        var arraySize = listArray.length;
        var combinedList = [];
        for (var i = 0; i < arraySize; i++) {
            var list = listArray[i];
            combinedList = list.reduce(pushIfNotExisting, combinedList);
        }
        callback(combinedList);
    });
}

var getLinksFromURL = function(currentURL, baseURL, includeAssets, callback) {

    request(currentURL, function(error, response, html) {
        console.log('====> request callback : ' + currentURL);

        var resultList = [];

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

            $('img').each(function(){
                var link = $(this).attr('src');
                list.push(link);
            });

            var initialState = {
                urlList: resultList,
                currentURL: currentURL,
                baseURL: baseURL
            };
            var newState = list.reduce(sanitizeURLs, initialState);
            console.log(newState.urlList.length);
            resultList = newState.urlList;
        } else {
            console.log('Request Error: ' + error);
        }

        callback(resultList);
    });
}

var getFileSize = function(fileURLList, callback) {
    console.log(fileURLList);
    var promises = [];
    var numOfURL = fileURLList.length;
    for (var i = 0; i < numOfURL; i++) {
        var file = fileURLList[i];
        var promise = new Promise(function(resolve, reject){
            console.log("~~~~> Get file size: " + file);
            var currentFile = file;
            remoteFileSize(currentFile, function(error, size) {
                var item = {
                    link: currentFile,
                    size: size
                };
                if (error) {
                    console.log("ssss> link: " + currentFile);
                    console.log("ssss> size: " + size);
                    item['error'] = error;
                }
                resolve(item);
            });
        });
        promises.push(promise);
    }

    Promise.all(promises).then(function(filesWithSizes) {
        callback(filesWithSizes);
    });
}

var sanitizeURLs = function(currentState, url) {
    if (isExternalLink(url)) {
        var list = currentState.urlList;
        var cleanURL = sanitizeExternalURL(url);
        currentState.urlList = pushIfNotExisting(list, cleanURL);
    } else if(isInternalLinkFromBaseURL(url)) {
        var completeURL = currentState.baseURL + url;
        var list = currentState.urlList;
        currentState.urlList = pushIfNotExisting(list, completeURL);
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
    var pattern = /\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
    return hasPattern(link, pattern);
}

/**
 * Checks if link is relative to the base URL
 * Example:
 * "/endpoint1/endpoint2"
 */
var isInternalLinkFromBaseURL = function(link) {
    var pattern = /^\/[^\/].*/g;
    return hasPattern(link, pattern);
}

/**
 * Checks if link is a file URL
 * Example:
 * "http://domain.com/file.html"
 */
var isFileURL = function(url) {
    var pattern = /\/.+\/[\w\d-_.]+\.[A-Za-z]{2,4}$/gi;
    return hasPattern(url, pattern);
}

/**
 * Checks if url does not have http: or https: at the beginning
 */
var isMissingHttp = function(url) {
    var pattern = /^\/\/.*/g;
    return hasPattern(url, pattern);
}

/**
 * Some external URLs don't have http. request returns an error.
 */
var sanitizeExternalURL = function(url) {
    if (isMissingHttp(url)) {
        url = 'http:' + url;
    }
    return url;
}

var hasPattern = function(string, pattern) {
    var result = false;
    if (string) {
        result = string.match(pattern);
    }
    return result;
}

var addFileURLs = function(fileURLList, url) {
    if (isFileURL(url)) {
        fileURLList = pushIfNotExisting(fileURLList, url);
    }
    return fileURLList;
}

var pushIfNotExisting = function(list, item) {
    if (!list.includes(item)) {
        list.push(item);
    }
    return list;
}
