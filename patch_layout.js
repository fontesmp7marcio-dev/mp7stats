const fs = require('fs');

let content = fs.readFileSync('src/components/StatsHubPlayerTrendsView.tsx', 'utf8');

// The layout blocks
const selectorRegex = /({\/\* 1\. SELETOR HORIZONTAL DE JOGADORES.*?<\/div>\n\n)/s;
const playerCardRegex = /({\/\* 2\. CARD DETALHADO DO JOGADOR.*?<div className="animate-in fade-in zoom-in-95 duration-200">\n\s*)/s;
const controlsRegex = /({\/\* Controles de Mercado e Localidade \*\/}[\s\S]*?<\/div>\n          <\/div>\n\n)/;

const matchSelector = content.match(selectorRegex);
const matchPlayerCard = content.match(playerCardRegex);
const matchControls = content.match(controlsRegex);

if (matchSelector && matchPlayerCard && matchControls) {
    const selectorBlock = matchSelector[0];
    const playerCardBlock = matchPlayerCard[0];
    const controlsBlock = matchControls[0];

    // Remove them
    content = content.replace(selectorBlock, '');
    content = content.replace(controlsBlock, '');

    // Now insert them in the correct order
    // We want: controlsBlock, then selectorBlock, then playerCardBlock
    // Wait, the controlsBlock currently belongs inside `activePlayer && marketHistory` condition.
    // It shouldn't depend on activePlayer. It should be at the top level.
}
