import "./App.css";
import React, { useState, useEffect } from "react";
import teslaData from './tesla_prepared.json';
import * as tf from "@tensorflow/tfjs";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [predictionResult, setPredictionResult] = useState("")
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    const runModel = async () => {
      // 1. Normalizálás előkészítése
      const changes = teslaData.map(d => d.change);
      const max = Math.max(...changes);
      const min = Math.min(...changes);
      const normalize = v => (v - min) / (max - min);

      // 2. Adatok előkészítése
      const inputs = teslaData.map(d => [normalize(d.change)]);
      const labels = teslaData.map(d => [d.direction]);

      const inputTensor = tf.tensor2d(inputs);
      const outputTensor = tf.tensor2d(labels);

      // 3. Modell építése
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 16, inputShape: [1], activation: 'relu'}));
      model.add(tf.layers.dense({ units: 1, activation: "sigmoid"}));
      model.compile({
        optimizer: tf.train.adam(),
        loss: tf.losses.meanSquaredError,
        metrics: ['accuracy'],
      });

      // 4. Tanítás
      await model.fit(inputTensor, outputTensor, {
        epochs: 500,
        batchSize: 16,
        shuffle: true,
      });

      // 5. Modell elmentése state-be
      setModelReady({ model, normalize })
    };

    runModel();
  }, []);

  const handlePrediction = async () => {
    if (!modelReady) return;

    const { model, normalize } = modelReady;
    const num = parseFloat(inputValue);
    if (isNaN(num)) {
      setPredictionResult("Érvénytelen szám");
      return;
    }

    const input = tf.tensor2d([[normalize(num)]]);
    const prediction = await model.predict(input).data();
    const value = prediction[0];

    if (value > 0.5) {
      setPredictionResult("⬆️ A modell szerint felfelé megy az ár.");
    } else {
      setPredictionResult("⬇️ A modell szerint lefelé megy az ár.");
    }
  };

  return (
    <div>
      <h1>AI Előrejelzés</h1>
      <input
        type="number"
        placeholder="Írj be egy értéket (pl. 2.53)"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <button onClick={handlePrediction} disabled={!modelReady}>
        Előrejelzés indítása
      </button>
      <hr />
      <div>{predictionResult}</div>
    </div>
  );
}

export default App;
