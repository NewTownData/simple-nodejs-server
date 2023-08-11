/*
  Copyright 2023 Voyta Krizek, https://www.newtowndata.com/

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
  
      http://www.apache.org/licenses/LICENSE-2.0
  
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
// eslint-disable-next-line no-unused-vars
const http = require("node:http");
const https = require("node:https");

const AllowedHeaders = [
  "accept",
  "accept-encoding",
  "accept-language",
  "user-agent",
  "cookie",
  "content-type",
  "content-length",
  "content-encoding",
  "date",
  "apigw-requestid",
];

function copyHeaders(headers) {
  const copiedHeaders = {};
  Object.keys(headers).forEach((header) => {
    if (AllowedHeaders.includes(header)) {
      copiedHeaders[header] = headers[header];
    } else {
      console.info(`Skipped header ${header} = ${headers[header]}`);
    }
  });
  return copiedHeaders;
}

/**
 * API proxy class.
 */
class ApiProxy {
  /**
   * Create an API proxy.
   *
   * @param {{[key: string]: string}} mappings Contains associative array where key is a path prefix and value is the target URL.
   */
  constructor(
    mappings = {
      "/example/api/": "https://api.example.com/v1/",
    }
  ) {
    this.mappings = mappings;
  }

  /**
   * Check if path components are supported by the proxy.
   *
   * @param {string[]} pathComponents string array of path components. Example: /example/api/ will become ['example','api']
   * @returns boolean - true if supported, false otherwise.
   */
  isProxy(pathComponents) {
    const matchedPrefixes = Object.keys(this.mappings).filter((prefix) =>
      `/${pathComponents.join("/")}`.startsWith(prefix)
    );
    return matchedPrefixes.length > 0;
  }

  /**
   * Execute a proxy call.
   *
   * @param {string[]} pathComponents
   * @param {http.IncomingMessage} request
   * @param {http.ServerResponse} response
   * @returns nothing
   */
  executeProxy(pathComponents, request, response) {
    const matchedPrefixes = Object.keys(this.mappings).filter((prefix) =>
      `/${pathComponents.join("/")}`.startsWith(prefix)
    );
    if (matchedPrefixes.length !== 1) {
      console.warn(`Invalid number of proxy prefixes: ${matchedPrefixes}`);
      response.writeHead(404, "Not Found", {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(`Not found\nProxy`);
      return;
    }

    const targetUrl = this.mappings[matchedPrefixes[0]];
    const suffix = `/${pathComponents.join("/")}`.substring(
      matchedPrefixes[0].length
    );
    console.info(`Suffix: ${suffix}`);
    const fullTargetUrl = `${targetUrl}${suffix}`;
    console.info(`Full target URL: ${fullTargetUrl}`);

    const url = new URL(fullTargetUrl);
    const requestOpts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: request.method,
      headers: copyHeaders(request.headers),
    };

    const req = https.request(requestOpts, (res) => {
      console.info(`Status: ${res.statusCode}`);
      response.writeHead(
        res.statusCode,
        res.statusMessage,
        copyHeaders(res.headers)
      );

      res.on("data", (chunk) => {
        response.write(chunk);
      });
      res.on("end", () => {
        response.end();
      });
    });
    req.on("error", (e) => {
      console.error(`Request failed: ${e}`);
      response.writeHead(500, "Internal Server Error", {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end(`Request failed: ${e}`);
    });

    if (req.method === "POST" || req.method === "PUT") {
      request
        .on("data", (chunk) => {
          req.write(chunk);
        })
        .on("end", () => {
          req.end();
        });
    } else {
      req.end();
    }
  }
}
module.exports = ApiProxy;
