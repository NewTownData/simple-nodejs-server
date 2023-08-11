function addResultText(text) {
  const resultElement = document.getElementById("api-call-result");
  resultElement.textContent += text + "\n";
  console.info(text);
}

async function callApi() {
  const result = await fetch("/example/api/ping");
  addResultText(`Result status code: ${result.status}`);
  const text = await result.text();
  addResultText(`Result text: ${text}`);
}

callApi();
