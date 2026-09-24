const fs = require('fs');
let content = fs.readFileSync('src/playerTrendsData.ts', 'utf8');

content = content.replace(/photoUrl: string;/, 'photoUrl?: string;\n  statshubId?: string;');

const players = [
  { id: "levski-perea", sid: "1395644" },
  { id: "levski-bouras", sid: "1126243" },
  { id: "levski-sangare", sid: "1095834" },
  { id: "levski-okoflex", sid: "976153" },
  { id: "salzburg-tabakovic", sid: "259803" },
  { id: "salzburg-camara", sid: "1542696" },
  { id: "salzburg-baidoo-edmund", sid: "1530948" },
  { id: "salzburg-konate", sid: "1139103" },
  { id: "salzburg-vertessen", sid: "909958" }
];

for (const p of players) {
  const regex = new RegExp(`(id:\\s*"${p.id}",[\\s\\S]*?photoUrl:\\s*)"([^"]+)"`);
  content = content.replace(regex, `$1"https://www.statshub.com/_next/image?url=https%3A%2F%2Fimages.statshub.com%2Fplayer%2F${p.sid}.png&w=96&q=75",\n      statshubId: "${p.sid}"`);
}

fs.writeFileSync('src/playerTrendsData.ts', content);
