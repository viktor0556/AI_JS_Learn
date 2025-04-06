import fs from 'fs';

const rawData = fs.readFileSync('tesla.json');

const teslaData = JSON.parse(rawData);

console.log('Beolvasott adatok száma:', teslaData.length);

const preparedData = []

for (let i = 1; i < teslaData.length; i++) {
  const prev = teslaData[i - 1];
  const curr = teslaData[i];

  const change = curr.close - prev.close;
  const direction = change > 0 ? 1 : 0;

  preparedData.push({
    date: curr.date,
    close: curr.close,
    change: parseFloat(change.toFixed(2)),
    direction: direction
  })
};

fs.writeFileSync('tesla_prepared.json', JSON.stringify(preparedData, null, 2));
console.log('Feldolgozott adat mentve tesla_prepared.json fájlba');

