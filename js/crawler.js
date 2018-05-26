var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var remoteFileSize = require('remote-file-size');

var visitedLinks = [];

module.exports = {
    crawl: function (url, depth, includeAssets, callback) {
        const level = 1;
        crawlThisLevel(level, [url], [url], url, depth, includeAssets, function(urlList) {
            writeToFile('output.json', urlList, callback)
        });
    }
};

var crawlThisLevel = function(level, totalURLList, levelURLList, baseURL, depth, includeAssets, callback) {

    console.log("Level " + level + " of " + depth);
    console.log("Number of links: " + levelURLList.length);

    getLinksForLevel(levelURLList, baseURL, includeAssets, function(levelOutput) {
        totalURLList = levelOutput.reduce(pushIfNotExisting, totalURLList);
        if (level < depth) {
            crawlThisLevel(level + 1, totalURLList, levelOutput, baseURL, depth, includeAssets, callback);
        } else {
            let fileURLList = totalURLList.filter(isFileURL);
            getFileSize(fileURLList, function(filesWithSizes){
                callback(filesWithSizes);
            });
        }
    });
}

var getLinksForLevel = function(urlList, baseURL, includeAssets, callback) {
    let promises = [];
    const numOfURL = urlList.length;
    for (let i = 0; i < numOfURL; i++) {
        let promise = new Promise(function(resolve, reject){
            getLinksFromURL(urlList[i], baseURL, includeAssets, function(links) {
                resolve(links);
            });
        });
        promises.push(promise);
    }

    Promise.all(promises).then(function(listArray) {
        console.log("---- Merging lists ----");
        const arraySize = listArray.length;
        let combinedList = [];
        for (var i = 0; i < arraySize; i++) {
            var list = listArray[i];
            combinedList = list.reduce(pushIfNotExisting, combinedList);
        }
        callback(combinedList);
    });
}

var getLinksFromURL = function(currentURL, baseURL, includeAssets, callback) {
    request(currentURL, function(error, response, html) {
        let resultList = [];

        if(!error) {
            const $ = cheerio.load(html);
            let list = [];

            $('a').each(function(){
                const href = $(this).attr('href');
                list.push(href);
            });

            $('script').each(function(){
                const script = $(this).attr('src');
                list.push(script);
            });

            $('link').each(function(){
                const link = $(this).attr('href');
                list.push(link);
            });

            if (includeAssets) {
                $('img').each(function(){
                    const link = $(this).attr('src');
                    list.push(link);
                });
            }

            let initialState = {
                urlList: resultList,
                currentURL: currentURL,
                baseURL: baseURL
            };
            const newState = list.reduce(sanitizeURLs, initialState);
            resultList = newState.urlList;
        } else {
            console.log('Request Error: ' + error);
        }

        callback(resultList);
    });
}

var getFileSize = function(fileURLList, callback) {
    let promises = [];
    const numOfURL = fileURLList.length;
    for (let i = 0; i < numOfURL; i++) {
        let file = fileURLList[i];
        var promise = new Promise(function(resolve, reject){
            let currentFile = file;
            remoteFileSize(currentFile, function(error, size) {
                let item = {
                    link: currentFile,
                    size: size
                };
                if (error) {
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
    let list = currentState.urlList;
    if (isExternalLink(url)) {
        const cleanURL = sanitizeExternalURL(url);
        currentState.urlList = pushIfNotExisting(list, cleanURL);
    } else if(isInternalLinkFromBaseURL(url)) {
        const completeURL = currentState.baseURL + url;
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
    const pattern = /\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
    return hasPattern(link, pattern);
}

/**
 * Checks if link is relative to the base URL
 * Example:
 * "/endpoint1/endpoint2"
 */
var isInternalLinkFromBaseURL = function(link) {
    const pattern = /^\/[^\/].*/g;
    return hasPattern(link, pattern);
}

/**
 * Checks if link is a file URL
 * Example:
 * "http://domain.com/file.html"
 */
var isFileURL = function(url) {
    const pattern = /\/.+\/[\w\d-_.]+\.[A-Za-z]{2,4}$/gi;
    return hasPattern(url, pattern);
}

/**
 * Checks if url does not have http: or https: at the beginning
 */
var isMissingHttp = function(url) {
    const pattern = /^\/\/.*/g;
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
    let result = false;
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

var writeToFile = function(filename, jsonData, callback) {
    fs.writeFile(
        filename,
        JSON.stringify(jsonData, null, 4),
        function(err) {
            console.log('File is saved! Filename: ' + filename);
            callback(filename);
        }
    );
}
