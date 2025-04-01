import fetch from 'node-fetch';
import yahooFinance from 'yahoo-finance2';
import fs from 'fs';

async function getStockData(symbol) {
  try {
    const queryOptions = { period1: '2024-01-01', period2: '2024-03-29', interval: '1d' };
    const result = await yahooFinance.historical(symbol, queryOptions, { fetch });
    console.log(result);
    fs.writeFileSync('microsoft.json', JSON.stringify(result, null, 2));  
  } catch (error) {
    console.error("Hiba történt:", error);
  }
}

getStockData('MSFT');
