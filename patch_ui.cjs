const fs = require('fs');
let code = fs.readFileSync('src/components/StatsHubPlayerTrendsView.tsx', 'utf8');

const targetStr = `
              <span className="text-[11px] font-bold text-slate-700 truncate w-full text-center">
                {rp.player.shortName}
              </span>
            </button>
`;

const replaceStr = `
              <div className="flex flex-col items-center w-full">
                <span className="text-[11px] font-bold text-slate-700 truncate w-full text-center">
                  {rp.player.shortName}
                </span>
                <span className="text-[10px] font-semibold text-[#22c55e]">
                  {rp.hitRateL10}% (L10)
                </span>
              </div>
            </button>
`;

if (code.includes(targetStr.trim())) {
  code = code.replace(targetStr.trim(), replaceStr.trim());
  fs.writeFileSync('src/components/StatsHubPlayerTrendsView.tsx', code);
  console.log('UI Patched!');
} else {
  console.log('String not found in UI!');
}
