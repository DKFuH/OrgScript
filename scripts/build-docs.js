const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const htmlDemosDir = path.join(repoRoot, "docs", "demos", "html");
const outputDir = path.join(repoRoot, "docs", "site");

function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const demos = fs.readdirSync(htmlDemosDir).filter(f => f.endsWith(".html") && f !== "index.html");

  const links = demos.map(file => {
    const name = file.replace(".html", "").replace(/-/g, " ");
    return `<li><a href="./demos/${file}">${name}</a></li>`;
  }).join("\n");

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OrgScript Documentation Site</title>
  <style>
    body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; color: #1e293b; background: #f8fafc; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; background: white; padding: 1rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    a { color: #2563eb; text-decoration: none; font-weight: bold; font-size: 1.1rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>OrgScript Showcase</h1>
  <p>Live documentation generated from OrgScript source files.</p>
  <ul>
    ${links}
  </ul>
  <footer>
    <hr>
    <p>Visit the <a href="https://github.com/DKFuH/OrgScript">GitHub Repository</a>.</p>
  </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml, "utf8");

  // Copy demos to site/demos
  const siteDemosDir = path.join(outputDir, "demos");
  fs.mkdirSync(siteDemosDir, { recursive: true });
  for (const file of demos) {
    fs.copyFileSync(path.join(htmlDemosDir, file), path.join(siteDemosDir, file));
  }

  console.log(`Documentation site built in ${outputDir}`);
}

main();
