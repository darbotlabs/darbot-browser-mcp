const config = JSON.stringify({ name: 'browser', command: 'npx', args: ["@darbotlabs/darbot-browser-mcp@latest"] });
const urlForWebsites = `vscode:mcp/install?${encodeURIComponent(config)}`;
// Github markdown does not allow linking to `vscode:` directly, so you can use our redirect:
const urlForGithub = `https://insiders.vscode.dev/redirect?url=${encodeURIComponent(urlForWebsites)}`;

console.log(urlForGithub);