import fetch from "node-fetch";
import UserAgent from "user-agents";
import { Newsletter, NewsletterFile } from "./types";
import chalk from "chalk";
import fs from "fs";
import readline from "readline";
import { Util } from "./util";

class Session {
    userAgent: string;
    targetEmail: string;

    constructor(targetEmail: string) {
        this.userAgent = new UserAgent().toString();
        this.targetEmail = targetEmail;
    }

    replaceEmailInQuery(url: string, email: string) {
        return Util.replaceAll(url, "$EMAIL", encodeURIComponent(email));
    }

    replaceEmailInBody(body: string, email: string, method: string) {
        if (method === "uri") {
            return Util.replaceAll(body, "$EMAIL", encodeURIComponent(email));
        } else if (method === "unchanged") {
            return Util.replaceAll(body, "$EMAIL", email);
        } else {
            console.log(chalk.red(`Error: Unknown replace method "${method}"`));
            process.exit(0);
        }
    }

    async _makeRequest(url: string, method: string, body: string | null, cookie?: string) {
        try {
            let resp = await fetch(url, {
                method: method,
                headers: {
                    "User-Agent": this.userAgent,
                    "content-type": "application/x-www-form-urlencoded",
                    cookie: cookie as any,
                },
                body: body as any,
                timeout: 5000,
            });
    
            return {
                ok: resp.ok,
                code: resp.status,
                codeText: resp.statusText,
                body: await resp.text(),
            };
        } catch {
            return {
                ok: false,
                code: 0,
                codeText: "",
                body: ""
            }
        }
        
    }

    async subscribeTo(newsletter: Newsletter) {
        let method = newsletter.subscribe_method;

        // determine whether we should use GET or POST
        let httpMethod = method.get ? "GET" : "POST";
        let fetchURL = method.get || method.post;
        let body = method.body || null;

        // validate that we actually have a url
        if (!fetchURL) {
            console.log(chalk.red("Error subscribing: URL not provided!"));
            return;
        }

        // log

        let parentURL: URL; // what url should be used for logging; parent_url field if it exists, fetch url otherwise
        if (newsletter.parent_url) {
            parentURL = new URL(newsletter.parent_url);
        } else {
            parentURL = new URL(fetchURL);
        }

        process.stdout.write(`Subscribing to ${chalk.cyan(parentURL.hostname)}...`);

        // replace parameters
        fetchURL = this.replaceEmailInQuery(fetchURL, this.targetEmail);

        if (body) {
            // determine way in which the "$EMAIL" signature should be
            // replaced; by default, formatted as a URI component.
            let replaceFmt = method.replace_format || "uri";
            body = this.replaceEmailInBody(body, this.targetEmail, replaceFmt);
        }

        // make request
        let response = await this._makeRequest(fetchURL, httpMethod, body, method.cookie);

        // finish logging
        if (response.ok) {
            process.stdout.write(chalk.green("ok\n"));
        } else {
            process.stdout.write(chalk.red(`failed (error code ${response.code})\n`));
            //console.log(chalk.red(response.body));
        }
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question(chalk.magenta("Target email: "), async (answer) => {
    let session = new Session(answer.trim());

    let newsletters: NewsletterFile = JSON.parse(fs.readFileSync("newsletters/all.json", "utf-8"));

    for (let newsletter of newsletters.newsletters) {
        await session.subscribeTo(newsletter);
    }

    console.log(chalk.green("Done."));
    rl.close();
});
