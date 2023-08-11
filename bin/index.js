const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const ApiProxy = require("./apiProxy.js");

const Port = 8080;
const SourceDir = path.join(process.cwd(), "src");

const apiProxy = new ApiProxy({
  "/example/api/": "https://api.example.com/v1/",
});

// reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
function detectMimeType(file) {
  if (file.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (file.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (file.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (file.endsWith(".png")) {
    return "image/png";
  }
  if (file.endsWith(".jpg")) {
    return "image/jpeg";
  }
  if (file.endsWith(".gif")) {
    return "image/gif";
  }
  if (file.endsWith(".ico")) {
    return "image/x-icon";
  }
  return "application/octet-stream";
}

function computeTargetFile(components) {
  let file = SourceDir;
  for (let i = 0; i < components.length; i += 1) {
    file = path.join(file, components[i]);
  }

  if (!fs.existsSync(file)) {
    return file;
  }

  const fileStat = fs.statSync(file);
  if (fileStat.isDirectory()) {
    file = path.join(file, "index.html");
  }

  return file;
}

const server = http.createServer((request, response) => {
  console.info(`Request: ${request.url}`);
  const pathComponents = request.url
    .split("/")
    .filter((component) => component !== "");
  console.info(`Path components: ${JSON.stringify(pathComponents)}`);

  if (apiProxy.isProxy(pathComponents)) {
    console.info(`Request will use proxy`);
    apiProxy.executeProxy(pathComponents, request, response);
    return;
  }

  const targetFile = computeTargetFile(pathComponents);
  if (!fs.existsSync(targetFile)) {
    response.writeHead(404, "Not Found", {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end(`Not found\nFile: ${targetFile}`);
    return;
  }

  const payload = fs.readFileSync(targetFile);
  response.writeHead(200, "OK", {
    "Content-Type": detectMimeType(targetFile),
  });
  response.end(payload);
});

server.listen(Port, () => {
  console.log(`Running at http://localhost:${Port}`);
});
