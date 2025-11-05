const http = require('http');

async function sendMcpRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: method,
            params: params
        });

        const req = http.request({
            hostname: 'localhost',
            port: 8931,
            path: '/mcp',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream'
            }
        }, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve(response);
                } catch (e) {
                    resolve({ body, status: res.statusCode });
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    try {
        console.log('1. Initializing MCP connection...');
        const initResponse = await sendMcpRequest('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
        });
        console.log('Init response:', JSON.stringify(initResponse, null, 2));

        console.log('\n2. Listing available tools...');
        const toolsResponse = await sendMcpRequest('tools/list');
        console.log('Tools response:', JSON.stringify(toolsResponse, null, 2));

        console.log('\n3. Navigating to Copilot Studio...');
        const navigateResponse = await sendMcpRequest('tools/call', {
            name: 'browser_navigate',
            arguments: {
                url: 'https://copilotstudio.microsoft.com'
            }
        });
        console.log('Navigate response:', JSON.stringify(navigateResponse, null, 2));

        console.log('\n4. Taking a screenshot...');
        const screenshotResponse = await sendMcpRequest('tools/call', {
            name: 'browser_take_screenshot',
            arguments: {}
        });
        console.log('Screenshot response:', JSON.stringify(screenshotResponse, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

main();