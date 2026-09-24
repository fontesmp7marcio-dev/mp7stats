const fs = require('fs');

function processFile(filename) {
  let content = fs.readFileSync(filename, 'utf8');
  content = content.replace(/photoUrl:\s*"https:\/\/images\.unsplash\.com[^"]+",/g, '');
  content = content.replace(/photoUrl:\s*string;/g, 'photoUrl?: string;');
  fs.writeFileSync(filename, content);
}

processFile('src/playerTrendsData.ts');
processFile('src/teamRostersDatabase.ts');
