const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const total = await mongoose.connection.collection('results').countDocuments();
  console.log('Total in DB:', total);
  
  const bySem = await mongoose.connection.collection('results').aggregate([
    { $group: { _id: '$semester', count: { $sum: 1 } } }
  ]).toArray();
  console.log('By semester:', bySem);

  const sample = await mongoose.connection.collection('results')
    .find({})
    .sort({ lastUpdated: -1 })
    .limit(20)
    .toArray();
  console.log('Recent entries:');
  sample.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.regNo}] Sem: ${r.semester} | Name: ${r.name} | SGPA: ${r.sgpa} | CGPA: ${r.cgpa} | Status: ${r.status}`);
  });

  await mongoose.disconnect();
}

check().catch(console.error);
