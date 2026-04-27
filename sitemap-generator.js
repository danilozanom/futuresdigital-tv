const fs = require('fs');
const path = require('path');

// Read subdominios.json
const jsonPath = path.join(__dirname, 'datos', 'subdominios.json');
let jsonData;

try {
  jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
} catch (err) {
  console.error('❌ Error reading datos/subdominios.json:', err.message);
  process.exit(1);
}

// Generate sitemap.xml
const domain = 'https://cfuturesdigital.es';
const urls = [
  {
    loc: `${domain}/paginas`,
    lastmod: new Date().toISOString().split('T')[0],
    priority: '0.9'
  }
];

// Add each subdomain entry
if (jsonData.subdominios && Array.isArray(jsonData.subdominios)) {
  jsonData.subdominios.forEach(subdom => {
    urls.push({
      loc: `${domain}/paginas?subdominio=${subdom.slug}`,
      lastmod: subdom.ultimaActualizacion,
      priority: '0.8'
    });
  });
}

// Helper function to escape XML special characters
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Build XML
const xmlLines = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
];

urls.forEach(url => {
  xmlLines.push('  <url>');
  xmlLines.push(`    <loc>${escapeXml(url.loc)}</loc>`);
  xmlLines.push(`    <lastmod>${url.lastmod}</lastmod>`);
  xmlLines.push(`    <priority>${url.priority}</priority>`);
  xmlLines.push('  </url>');
});

xmlLines.push('</urlset>');
const xml = xmlLines.join('\n');

// Write sitemap.xml
const sitemapPath = path.join(__dirname, 'sitemap.xml');
try {
  fs.writeFileSync(sitemapPath, xml);
  console.log(`✓ Sitemap generated successfully: ${sitemapPath}`);
  console.log(`✓ Total URLs: ${urls.length}`);
} catch (err) {
  console.error('❌ Error writing sitemap.xml:', err.message);
  process.exit(1);
}
