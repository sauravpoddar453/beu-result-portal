const mongoose = require('mongoose');
require('dotenv').config();

async function audit() {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await mongoose.connection.collection('results').find({}).toArray();
  await mongoose.disconnect();

  console.log('==================================================================');
  console.log('📋 COMPREHENSIVE AUDIT REPORT: PURNEA COLLEGE OF ENGINEERING (151)');
  console.log('==================================================================');
  console.log(`Total marksheets in DB: ${docs.length}\n`);

  const allowedBatches = ['22', '23', '24', '25'];
  const pceDocs = docs.filter(d => d.regNo && allowedBatches.includes(d.regNo.slice(0, 2)));

  console.log(`Target Batches (22, 23, 24, 25) marksheets: ${pceDocs.length}\n`);

  // Group by Batch -> Semester -> Branch
  const matrix = {};
  const studentRollsByBatch = { '22': new Set(), '23': new Set(), '24': new Set(), '25': new Set() };
  const branchesFound = new Set();

  pceDocs.forEach(d => {
    const batch = d.regNo.slice(0, 2);
    const branch = d.regNo.slice(5, 8);
    const sem = (d.semester || '1').toString().replace(/[^0-9]/g, '') || '1';

    branchesFound.add(branch);
    studentRollsByBatch[batch].add(d.regNo);

    if (!matrix[batch]) matrix[batch] = {};
    if (!matrix[batch][sem]) matrix[batch][sem] = { count: 0, rolls: [] };

    matrix[batch][sem].count++;
    matrix[batch][sem].rolls.push(d.regNo);
  });

  console.log('1. UNIQUE STUDENTS IDENTIFIED BY BATCH:');
  for (const b of allowedBatches) {
    const rolls = Array.from(studentRollsByBatch[b]).sort();
    console.log(`   - Batch ${b}: ${rolls.length} unique students (Roll range: ${rolls[0] || 'N/A'} to ${rolls[rolls.length - 1] || 'N/A'})`);
  }

  console.log('\n2. BRANCHES DETECTED IN PCE:');
  branchesFound.forEach(br => {
    console.log(`   - Branch Code ${br}: ${br === '131' ? 'CSE (Artificial Intelligence & Data Science)' : br === '101' ? 'Civil' : br === '102' ? 'Mechanical' : br === '105' ? 'CSE' : 'Other'}`);
  });

  console.log('\n3. SEMESTER-WISE COMPLETION MATRIX FOR EACH BATCH:');
  for (const b of allowedBatches) {
    console.log(`\n   --- BATCH ${b} (Total Students: ${studentRollsByBatch[b].size}) ---`);
    if (!matrix[b]) {
      console.log('       No records found for this batch.');
      continue;
    }
    for (let sem = 1; sem <= 8; sem++) {
      const semStr = sem.toString();
      if (matrix[b][semStr]) {
        const c = matrix[b][semStr].count;
        const totalStu = studentRollsByBatch[b].size;
        const percent = totalStu > 0 ? ((c / totalStu) * 100).toFixed(0) : 0;
        console.log(`       Sem ${sem}: ✅ ${c} marksheets fetched (${percent}% of batch)`);
      } else {
        console.log(`       Sem ${sem}: ⏳ 0 marksheets (Pending or exam not yet held/published)`);
      }
    }
  }

  console.log('\n==================================================================');
}

audit().catch(console.error);
