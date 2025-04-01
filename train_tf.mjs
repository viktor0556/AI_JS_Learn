import fs from 'fs';
import * as tf from '@tensorflow/tfjs';

// 1. Adatok beolvasása és normalizálás
const rawData = fs.readFileSync('tesla_prepared.json');
const data = JSON.parse(rawData);

const changes = data.map(d => d.change);
const max = Math.max(...changes);
const min = Math.min(...changes);

const normalize = value => (value - min) / (max - min);

const inputs = data.map(d => [normalize(d.change)]);
const labels = data.map(d => [d.direction]);

const inputTensor = tf.tensor2d(inputs);
const outputTensor = tf.tensor2d(labels);

// 2. Modell felépítése
const model = tf.sequential();

model.add(tf.layers.dense({ units: 32, inputShape: [1], activation: 'relu' }));
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

model.compile({
  optimizer: tf.train.adam(),
  loss: tf.losses.meanSquaredError,
  metrics: ['accuracy'],
});

// 3. Tanítás
await model.fit(inputTensor, outputTensor, {
  epochs: 1000,
  batchSize: 16,
  shuffle: true,
  callbacks: {
    onEpochEnd: (epoch, logs) => {
      console.log(`Epoch ${epoch + 1}: loss = ${logs.loss.toFixed(4)}, acc = ${logs.acc.toFixed(4)}`);
    }
  }
});

// 4. Tesztelés
const testValue = 2.53;
const normalized = normalize(testValue);
const input = tf.tensor2d([[normalized]]);
const prediction = await model.predict(input).data();

console.log(`Előrejelzés (${testValue} Ft változás):`, prediction[0] > 0.5 ? '⬆️ felfelé' : '⬇️ lefelé');
