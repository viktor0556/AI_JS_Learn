import "./App.css";
import React, { useEffect, useState, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import matches from "./matches.json";

function App() {
  const [modelReady, setModelReady] = useState(false);
  const [prediction, setPrediction] = useState("");
  const [probabilities, setProbabilities] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const trainMatchesRef = useRef([]);
  const testMatchesRef = useRef([]);
  const [explanation, setExplanation] = useState("");

  // This function calculates the average form of a team,
  // i.e. how many goals they have scored on average in the last X matches.
  // This shows the form the team is in offensively.
  // The higher it is, the better they have performed recently.
  //
  // Example:
  // goalsArray = [2, 3, 1, 0] → average = (2 + 3 + 1 + 0) / 4 = 1.5
  // If empty or no data: returns 0

  const calculateForm = (goalsArray) => {
    if (!goalsArray || goalsArray.length === 0) return 0;
    const totalGoals = goalsArray.reduce((a, b) => a + b, 0);
    return totalGoals / goalsArray.length;
  };

  const calculateGoalDifference = (goalsArray, concededArray) => {
    if (
      !goalsArray ||
      goalsArray.length === 0 ||
      !concededArray ||
      concededArray.length === 0
    )
      return 0;
    const totalGoals = goalsArray.reduce((a, b) => a + b, 0);
    const totalConceded = concededArray.reduce((a, b) => a + b, 0);

    return totalGoals - totalConceded;
  };

  const calculateAccuracy = (a, b) => {
    return a.every((val, index) => val === b[index]);
  };

  const testModelAccuracy = async () => {
    if (!modelReady) return;

    let correct = 0;

    const testMatches = testMatchesRef.current;
    if (!testMatches || testMatches.length === 0) return;

    for (const m of testMatches) {
      const hazaiForm = calculateForm(m.homePrevMatches.goals);
      const vendegForm = calculateForm(m.awayPrevMatches.goals);
      const hazaiDiff = calculateGoalDifference(
        m.homePrevMatches.goals,
        m.homePrevMatches.conceded
      );
      const vendegDiff = calculateGoalDifference(
        m.awayPrevMatches.goals,
        m.awayPrevMatches.conceded
      );

      const input = tf.tensor2d([[hazaiForm, vendegForm, hazaiDiff, vendegDiff]]);
      const predictionTensor = modelReady.predict(input);
      const predictionArray = await predictionTensor.data();
      const predictIndex = predictionArray.indexOf(
        Math.max(...predictionArray)
      );

      const actualIndex = m.result === 1 ? 0 : m.result === 0 ? 1 : 2;

      if (predictIndex === actualIndex) {
        correct++;
      }
    }

    const accuracyValue = (correct / testMatches.length) * 100;
    setAccuracy(accuracyValue.toFixed(1));
  };

  useEffect(() => {
    const shuffledMatches = [...matches].sort(() => Math.random() - 0.5);
    const trainSize = Math.floor(shuffledMatches.length * 0.8);
    trainMatchesRef.current = shuffledMatches.slice(0, trainSize);
    testMatchesRef.current = shuffledMatches.slice(trainSize);

    const trainModel = async () => {
      const inputs = trainMatchesRef.current
        .filter((m) => m.home !== undefined)
        .map((m) => {
          const hazaiForm = calculateForm(m.homePrevMatches.goals);
          const vendegForm = calculateForm(m.awayPrevMatches.goals);

          const hazaiDiff = calculateGoalDifference(
            m.homePrevMatches.goals,
            m.homePrevMatches.conceded
          );
          const vendegDiff = calculateGoalDifference(
            m.awayPrevMatches.goals,
            m.awayPrevMatches.conceded
          );

          return [hazaiForm, vendegForm, hazaiDiff, vendegDiff];
        });

      const labels = trainMatchesRef.current
        .filter((m) => m.home !== undefined)
        .map((m) => {
          if (m.result === 1) return [1, 0, 0];
          if (m.result === 0) return [0, 1, 0];
          return [0, 0, 1];
        });

      const inputTensor = tf.tensor2d(inputs);
      const outputTensor = tf.tensor2d(labels);

      const model = tf.sequential();
      model.add(
        tf.layers.dense({ inputShape: [4], units: 16, activation: "relu" })
      );
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

      await model.save("indexeddb://foci-modell-v2");
      setModelReady(model);
      console.log("Modell betanítva és elmentve.");
    };

    const loadOrTrainModel = async () => {
      try {
        const model = await tf.loadLayersModel("indexeddb://foci-modell-v2");
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

    const randomMatch =
      testMatchesRef.current[
        Math.floor(Math.random() * testMatchesRef.current.length)
      ];
    const hf = calculateForm(randomMatch.homePrevMatches.goals);
    const af = calculateForm(randomMatch.awayPrevMatches.goals);

    const hDiff = calculateGoalDifference(
      randomMatch.homePrevMatches.goals,
      randomMatch.homePrevMatches.conceded
    );
    const aDiff = calculateGoalDifference(
      randomMatch.awayPrevMatches.goals,
      randomMatch.awayPrevMatches.conceded
    );

    const input = tf.tensor2d([[hf, af, hDiff, aDiff]]);

    const predictionTensor = modelReady.predict(input);
    const predictionArray = await predictionTensor.data();

    // The predictionArray contains three values:
    // [home win probability, draw probability, away win probability]
    // E.g. predictionArray = [0.2, 0.7, 0.1] → gives a 70% chance of a draw
    // Math.max(...predictionArray) takes the highest probability (e.g. 0.7)
    // .indexOf(...) finds the position of this value (here: 1)
    // Based on this, we decide which of the three possible outcomes the AI ​​will choose

    const index = predictionArray.indexOf(Math.max(...predictionArray));
    const resultMap = ["Hazai győzelem", "Döntetlen", "Vendég Győzelem"];

    setPrediction(resultMap[index]);

    const percentageProbs = predictionArray.map((p) => (p * 100).toFixed(1));
    setProbabilities(percentageProbs);

    await testModelAccuracy();

    setPrediction(resultMap[index]);
    setProbabilities(percentageProbs);

    const explanationText = `Bemenet:
Hazai forma = ${hf}, Vendég forma = ${af}
Hazai gólkülönbség = ${hDiff}, Vendég gólkülönbség = ${aDiff}
AI döntés: ${resultMap[index]} (${percentageProbs[index]}%)`;

    setExplanation(explanationText);
  };

  return (
    <div>
      <h1>Foci meccs eredményjósló AI</h1>

      {accuracy !== null && <p>Modell pontossága: {accuracy}%</p>}
      <hr />
      <h3>Eredmény: {prediction}</h3>

      <button onClick={handlePredict}>Jóslás</button>

      {explanation && (
        <div
          style={{
            marginTop: "1rem",
            background: "#f1f1f1",
            padding: "1rem",
            borderRadius: "10px",
          }}
        >
          <p>{explanation}</p>
        </div>
      )}

      {probabilities.length > 0 && (
        <div>
          <p>Valószínűségek:</p>
          <ul>
            <li>Hazai győzelem: {probabilities[0]}%</li>
            <li>Döntetlen: {probabilities[1]}%</li>
            <li>Vendég győzelem: {probabilities[2]}%</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
