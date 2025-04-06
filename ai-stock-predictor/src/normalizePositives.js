function NormalizePositives() {
  const allNumbs = [-3, 0, 2, 5, -1];
  const changes = [-2.5, 0, 1.2, 3.1, -1.3, 2.8, 0, 4.2];

    const negNumbs = allNumbs.filter((numbs) => numbs <= 0)
    const remainNumbs = allNumbs.filter((numbs) => numbs >= 0)
    console.log(
      "Összes negatív szám: ",
      negNumbs,
      "Maradék számok: ",
      remainNumbs
    );
    const max = Math.max(...remainNumbs)
    const min = Math.min(...remainNumbs)

    const normalize = v => (v - min) / (max - min)
    const normalized = remainNumbs.map(normalize)

    console.log(normalized)

    const posNumbs = changes.filter(n => n >= 0);
    const minNumb = Math.min(...posNumbs)
    const maxNumb = Math.max(...posNumbs)
    const normalizeNumb = v => (v - minNumb) / (maxNumb - minNumb)
    const NormalizedNumb = posNumbs.map(normalizeNumb);

    console.log('Új normalized: ', NormalizedNumb)

    /*
    const normalize = v => {
      return max === min ? 1 : (v - min) / (max - min);
    };

  Vagy ha azt szeretnéd, hogy egyetlen érték esetén mindig 0 legyen:
    const normalize = v => {
      return max === min ? 0 : (v - min) / (max - min);
    };
    */

    const changes2 = [2.5, 2.5, 2.5];
    const minNumb2 = Math.min(...changes2)
    const maxNumb2 = Math.max(...changes2)
    const normalize2 = v => {
      return maxNumb2 === minNumb2 ? 1 : (v - minNumb2) / (maxNumb2 - minNumb2);
    }; // Helyes megoldás 3 ugyanolyan értékű array-ra
    // const normalize2 = v => {
    //   return maxNumb2 === min ? 0 : (v - minNumb2) / (maxNumb2 - minNumb2) 
    // } - infinity
    // const normalizeNumb2 = v => (v - minNumb2) / (maxNumb2 - minNumb2) - infinity
    const NormalizedNumb2 = posNumbs.map(normalize2);

    console.log("Új normalize: ", NormalizedNumb2)
  };

export default NormalizePositives;
