import { MESSY_TEST_ROWS } from './messyDataSample';
import { buildCompactDataProfile, profileDataset } from '../src/utils/dataProfiler';
import { generateSafeDefaultPlan, validateCleaningPlan } from '../src/utils/planValidator';
import { executeDeterministicPlan } from '../src/utils/deterministicCleaner';

const columns = Object.keys(MESSY_TEST_ROWS[0]);
const rawMatrix = [columns, ...MESSY_TEST_ROWS.map(r => columns.map(c => (r as any)[c]))];

const profile = buildCompactDataProfile(rawMatrix, MESSY_TEST_ROWS, columns, {
  fileName: 'messy_test_data.xlsx',
  fileType: 'xlsx',
  fileSize: '15 KB',
  sheetNames: ['Sheet1'],
  activeSheet: 'Sheet1',
});

console.log('--- PROFILE DETECTED TYPES ---');
profile.columnProfiles.forEach(p => {
  console.log(`Column ${p.name}: detectedType = ${p.detectedType}, samples = ${JSON.stringify(p.topFrequentValues.map(v => v.value))}`);
});

const plan = generateSafeDefaultPlan(columns, profile);
console.log('\n--- GENERATED PLAN ---');
console.log(JSON.stringify(plan, null, 2));

const val = validateCleaningPlan(plan, columns, MESSY_TEST_ROWS.length, profile);
const result = executeDeterministicPlan(MESSY_TEST_ROWS, columns, val.sanitizedPlan);

console.log('\n--- CLEANED DATA ROWS ---');
console.table(result.cleanedRows);

console.log('\n--- CHANGES MADE ---');
console.log(result.summary.changesMade);

console.log('\n--- LEFT UNCHANGED ---');
console.log(result.summary.leftUnchanged);
