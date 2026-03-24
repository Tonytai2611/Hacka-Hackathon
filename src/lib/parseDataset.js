import Papa from 'papaparse';
import { CONFIG } from '../constants/config';

export function loadAndParseDataset() {
  return new Promise((resolve, reject) => {
    Papa.parse('/new_demo_dataset_700.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length) {
          console.warn("Some parsing errors:", results.errors);
        }
        
        // results.data contains the array of rows
        // We ensure we only take the first 603 rows to match exactly 500 + 103.
        let rawData = results.data.filter(row => row.TransactionAmt !== undefined);
        
        const cleanData = rawData.slice(0, 700).map((row, index) => {
          let isCluster3 = index >= 500 && index < 603; // Exactly 103 Cluster 3 items
          
          return {
            rowOriginal: row,
            id: `T${String(3500000 + index).slice(1)}`,
            isCluster3: isCluster3
          };
        });

        resolve(cleanData);
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}
