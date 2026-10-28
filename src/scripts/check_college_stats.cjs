const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

async function checkColleges() {
  await mongoose.connect(process.env.MONGO_URI);
  const col = mongoose.connection.collection('results');

  const stats = await col.aggregate([
    {
      $group: {
        _id: '$college',
        studentCount: { $sum: 1 },
        semesters: { $addToSet: '$semester' }
      }
    },
    { $sort: { studentCount: -1 } }
  ]).toArray();

  const totalResults = await col.countDocuments();
  console.log(`\n==================================================`);
  console.log(`📊 TOTAL RECORDS IN DATABASE: ${totalResults}`);
  console.log(`🏛️ TOTAL COLLEGES WITH DATA: ${stats.length}`);
  console.log(`==================================================\n`);

  stats.forEach((c, idx) => {
    console.log(`${(idx + 1).toString().padStart(2, ' ')}. ${c._id || 'Unknown'}: ${c.studentCount} records (Sems: ${c.semesters.sort().join(', ')})`);
  });

  // Check statewide progress file
  try {
    const prog = JSON.parse(fs.readFileSync('src/scripts/statewide_progress.json', 'utf8'));
    console.log(`\n--- CURRENT STATEWIDE CRAWLER PROGRESS ---`);
    console.log(`Last Exam Index: ${prog.lastExamIndex}`);
    console.log(`Last College Index: ${prog.lastCollegeIndex}`);
    console.log(`Session Saved Count: ${prog.totalSavedSession}`);
  } catch (e) {}

  await mongoose.disconnect();
}

checkColleges().catch(console.error);
