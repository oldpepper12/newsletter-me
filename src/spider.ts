/*
    A webcrawler used to find webpages with newsletters
*/

import fetch from "node-fetch";
import UserAgent from "user-agents";
import { JSDOM } from "jsdom";
import chalk from "chalk";

export class Spider {
    userAgent: string;
    visited: Set<string>;
    visitedDomains: Set<string>;

    deepSearch: boolean;

    constructor(deepSearch: boolean) {
        this.userAgent = new UserAgent().toString();
        this.visited = new Set<string>();
        this.visitedDomains = new Set<string>();
        this.deepSearch = deepSearch;
    }

    crawl(url: string) {
        let _url = new URL(url);
        let baseURL;

        if (this.deepSearch) {
            _url.search = "";
            baseURL = _url.href;
        } else {
            baseURL = _url.host;
        }

        if (!this.visitedDomains.has(_url.hostname)) {
            this.onVisitNewDomain(_url.hostname);
        }
        this.visitedDomains.add(_url.hostname);

        if (this.visited.has(baseURL)) {
            return;
        }

        if (url.startsWith("about:blank")) {
            return;
        }

        this.visited.add(baseURL);

        fetch(url, {
            headers: { "User-Agent": this.userAgent },
            method: "get",
        })
            .then(async (resp) => {
                let data = await resp.text();
                let type = resp.headers.get("Content-Type");

                let nodes: URL[] = [];

                if (type?.startsWith("text/html")) {
                    this.onVisitPage(url, data);

                    nodes = this.extractNodesFromHTML(data, url);
                } else {
                    nodes = this.extractNodesFromPlaintext(data);
                }

                for (let node of nodes) {
                    this.crawl(node.href);
                }
            })
            .catch((err) => {});
    }

    extractNodesFromHTML(data: string, base: string) {
        let dom = new JSDOM(data);
        let document = dom.window.document;

        let aHrefNodes = Array.from(document.querySelectorAll("a"))
            .map((el: any) => el.href)
            .filter((url) => Boolean(url))
            .map((url) => new URL(url, base));

        let jsFiles = Array.from(document.querySelectorAll("script"))
            .map((el: any) => el.src)
            .filter((url) => Boolean(url))
            .map((url) => new URL(url, base));

        return jsFiles.concat(aHrefNodes);
    }

    extractNodesFromPlaintext(data: string) {
        let urlRegex =
            /["'](https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})["']/g;

        return Array.from(data.matchAll(urlRegex)).map((n) => new URL(n[0]));
    }

    onVisitPage(url: string, data: string) {
        
    }

    onVisitNewDomain(domain: string) {
        console.log(domain);
    }
}

let spider = new Spider(true);

spider.crawl("http://info.cern.ch/hypertext/WWW/TheProject.html");
