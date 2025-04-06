import fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const width = 800;
const height = 400;
const chartCanvas = new ChartJSNodeCanvas({ width, height });

// === 1. Adatok beolvasása ===
const rawData = fs.readFileSync('tesla_prepared.json');
const data = JSON.parse(rawData);

// === 2. Adatok normalizálása ===
const changes = data.map(d => d.change);
const max = Math.max(...changes);
const min = Math.min(...changes);
const normalize = v => (v - min) / (max - min);

// === 3. Modell létrehozása és betanítása ===
const inputs = data.map(d => [normalize(d.change)]);
const labels = data.map(d => [d.direction]);

const inputTensor = tf.tensor2d(inputs);
const outputTensor = tf.tensor2d(labels);

const model = tf.sequential();
model.add(tf.layers.dense({ units: 16, inputShape: [1], activation: 'relu' }));
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
model.compile({
  optimizer: tf.train.adam(),
  loss: tf.losses.meanSquaredError,
  metrics: ['accuracy'],
});

await model.fit(inputTensor, outputTensor, {
  epochs: 1000,
  batchSize: 16,
  shuffle: true
});

// === 4. Predikció végig minden adatra ===
const real = [];
const predicted = [];

for (let i = 0; i < data.length; i++) {
  const actual = data[i].direction;
  const input = tf.tensor2d([[normalize(data[i].change)]]);
  const pred = await model.predict(input).data();
  const predictedVal = pred[0] > 0.5 ? 1 : 0;

  real.push(actual);
  predicted.push(predictedVal);
}

// === 5. Grafikon készítése ===
const config = {
  type: 'line',
  data: {
    labels: data.map(d => d.date.slice(5)), // dátum, csak hónap-nap
    datasets: [
      {
        label: 'Valós irány (⬆️ = 1, ⬇️ = 0)',
        data: real,
        borderColor: 'blue',
        fill: false
      },
      {
        label: 'Jósolt irány (modell)',
        data: predicted,
        borderColor: 'red',
        fill: false
      }
    ]
  },
  options: {
    responsive: false,
    scales: {
      y: {
        ticks: {
          callback: value => value === 1 ? '⬆️' : '⬇️'
        },
        beginAtZero: true,
        max: 1
      }
    }
  }
};

// === 6. Kép generálása ===
const image = await chartCanvas.renderToBuffer(config);
fs.writeFileSync('prediction_chart.png', image);
console.log('prediction_chart.png létrehozva!');

await model.save('file://./modelSave');
