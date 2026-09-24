const fs = require('fs');

async function run() {
  const file = 'src/teamRostersDatabase.ts';
  let content = fs.readFileSync(file, 'utf8');

  // get all names
  const regex = /name: "([^"]+)"/g;
  let match;
  const names = [];
  while ((match = regex.exec(content)) !== null) {
    names.push(match[1]);
  }

  const uniqueNames = [...new Set(names)];

  const map = {};

  for (const name of uniqueNames) {
    try {
      const url = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=" + encodeURIComponent(name);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.player && data.player.length > 0) {
        // Find soccer
        const player = data.player.find(p => p.strSport === "Soccer" || p.strSport === "Football") || data.player[0];
        if (player.strCutout || player.strThumb) {
          map[name] = player.strCutout || player.strThumb;
          console.log(`Found ${name}`);
        } else {
          console.log(`No image ${name}`);
        }
      } else {
        console.log(`Not found ${name}`);
      }
    } catch(e) {
      console.log(`Error ${name}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  for (const [name, url] of Object.entries(map)) {
    const r = new RegExp(`(name:\\s*"${name}"[\\s\\S]*?)(?:photoUrl:\\s*"[^"]*",\\s*)?role:`);
    content = content.replace(r, `$1photoUrl: "${url}", role:`);
  }

  fs.writeFileSync(file, content);
  console.log('Done!');
}

run();
