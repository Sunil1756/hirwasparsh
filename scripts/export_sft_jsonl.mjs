import fs from 'fs';
import { SFT_46_GROUND_TRUTH_DATASET, exportSftDatasetAsJsonl } from '../src/data/sft46GroundTruthDataset.js';

// If running directly, let's ensure ts-node or transpiled version or just parse the data
const jsonlContent = exportSftDatasetAsJsonl(SFT_46_GROUND_TRUTH_DATASET);
fs.writeFileSync('public/datasets/green_enlightenment_sft_46_pairs.jsonl', jsonlContent, 'utf-8');
console.log(`Exported ${SFT_46_GROUND_TRUTH_DATASET.length} pairs to public/datasets/green_enlightenment_sft_46_pairs.jsonl`);
