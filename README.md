# webcrawler

## Usage

   localhost:8888/crawl?url=<url>&depth=<depth>&assets=<include asset flag>

Example:

   localhost:8888/crawl?url=http://www.google.com&depth=2>&assets=true

Parameters:

    url: The base url where you want to start crawling.
    depth: The number of hops from the base url that the crawler will go to.
    assets: If true, the crawler will include assets from img tag.

After the crawling has finished, it will trigger a download of the output file.
