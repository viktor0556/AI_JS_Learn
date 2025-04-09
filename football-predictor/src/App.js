import "./App.css";
import React, { useEffect, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import matches from "./matches.json";

function App() {
  const [modelReady, setModelReady] = useState(false);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [prediction, setPrediction] = useState("");
  const [homeForm, setHomeForm] = useState("");
  const [awayForm, setAwayForm] = useState("");

  const calculateForm = (goalsArray) => {
    if (!goalsArray || goalsArray.length === 0) return 0;
    const totalGoals = goalsArray.reduce((a, b) => a + b, 0);
    return totalGoals / goalsArray.length;
  };  

  const calculateAccuracy = (a, b) => {
    return a.every((val, index) => val === b[index]);
  };
  
  useEffect(() => {
    const trainModel = async () => {
      const inputs = matches
        .filter((m) => m.home !== undefined)
        .map((m) => {
          const hazaiForm = calculateForm(m.homePrevMatches.goals);
          const vendegForm = calculateForm(m.awayPrevMatches.goals);
          return [m.home, m.away, hazaiForm, vendegForm];
        });
  
      const labels = matches
        .filter((m) => m.home !== undefined)
        .map((m) => {
          if (m.result === 1) return [1, 0, 0];
          if (m.result === 0) return [0, 1, 0];
          return [0, 0, 1];
        });
  
      const inputTensor = tf.tensor2d(inputs);
      const outputTensor = tf.tensor2d(labels);
  
      const model = tf.sequential();
      model.add(tf.layers.dense({ inputShape: [4], units: 16, activation: "relu" }));
      model.add(tf.layers.dense({ units: 3, activation: "softmax" }));
  
      model.compile({
        optimizer: tf.train.adam(),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
      });
  
      await model.fit(inputTensor, outputTensor, {
        epochs: 500,
        batchSize: 4,
        shuffle: true,
      });
  
      await model.save("indexeddb://foci-modell");
      setModelReady(model);
      console.log("Modell betanítva és elmentve.");
    };
  
    const loadOrTrainModel = async () => {
      try {
        const model = await tf.loadLayersModel("indexeddb://foci-modell");
        setModelReady(model);
        console.log("Mentett modell betöltve.");
      } catch (error) {
        console.log("Nincs mentett modell, új tanítás indul...");
        await trainModel();
      }
    };
  
    loadOrTrainModel();
  }, []);
  
  const handlePredict = async () => {
    if (!modelReady || typeof modelReady.predict !== "function") {
      alert("A modell még nem töltődött be teljesen!");
      return;
    }

    const hg = parseFloat(homeGoals);
    const ag = parseFloat(awayGoals);
    const hf = parseFloat(homeForm);
    const af = parseFloat(awayForm);

    if ([hg, ag, hf, af].some((v) => isNaN(v))) {
      alert("Minden mezőbe számot kell írni!");
      return;
    }

    const input = tf.tensor2d([
      [
        parseFloat(homeGoals),
        parseFloat(awayGoals),
        parseFloat(homeForm),
        parseFloat(awayForm),
      ],
    ]);

    const predictionTensor = modelReady.predict(input);
    const predictionArray = await predictionTensor.data();

    const index = predictionArray.indexOf(Math.max(...predictionArray));
    const resultMap = ["Hazai győzelem", "Döntetlen", "Vendég Győzelem"];

    setPrediction(resultMap[index]);
  };

  return (
    <div>
      <h1>Foci meccs eredményjósló AI</h1>
      <input
        type="number"
        placeholder="Hazai gólok"
        value={homeGoals}
        onChange={(e) => setHomeGoals(e.target.value)}
      />
      <input
        type="number"
        placeholder="Vendég gólok"
        value={awayGoals}
        onChange={(e) => setAwayGoals(e.target.value)}
      />
      <input
        type="number"
        placeholder="Hazai formaátlag"
        value={homeForm}
        onChange={(e) => setHomeForm(e.target.value)}
      />
      <input
        type="number"
        placeholder="Vendég formaátlag"
        value={awayForm}
        onChange={(e) => setAwayForm(e.target.value)}
      />

      <button onClick={handlePredict}>Jóslás indítása</button>
      <hr />
      <h3>Eredmény: {prediction}</h3>
    </div>
  );
}

export default App;
