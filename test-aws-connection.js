const https = require('https');

const GATEKEEPER_URL = 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/analyze-transactions';
const DEPLOY_URL = 'https://1y2xabeojj.execute-api.us-east-1.amazonaws.com/approve-rule';

function testPost(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        console.log(`URL: ${url}`);
        console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`Response Body: ${body}\n`);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Error on ${url}:`, e.message);
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('--- AWS API CONNECTIVITY TEST (NODE.JS) ---');
  try {
    await testPost(GATEKEEPER_URL, { action: 'ping' });
    await testPost(DEPLOY_URL, { action: 'ping' });
    console.log('--- TEST COMPLETE ---');
  } catch (err) {
    console.log('Test failed.');
  }
})();
