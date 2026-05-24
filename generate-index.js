const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const files = fs.readdirSync(rootDir, { withFileTypes: true });
const pages = [];

for (const file of files) {
  if (file.isDirectory()) {
    const dirName = file.name;
    // Skip hidden directories and build/config folders
    if (dirName.startsWith('.') || dirName === 'node_modules' || dirName === 'images') {
      continue;
    }

    const indexPath = path.join(rootDir, dirName, 'index.html');
    if (fs.existsSync(indexPath)) {
      let title = dirName;
      let description = '';
      
      try {
        const html = fs.readFileSync(indexPath, 'utf8');
        
        // Extract <title>
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }

        // Extract meta description if available
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || 
                          html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
      } catch (err) {
        console.error(`Error reading ${indexPath}:`, err);
      }

      pages.push({
        path: dirName,
        title: title,
        description: description
      });
    }
  }
}

fs.writeFileSync(path.join(rootDir, 'pages.json'), JSON.stringify(pages, null, 2), 'utf8');
console.log(`Successfully generated pages.json with ${pages.length} pages.`);
