const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const allDocs = await mongoose.connection.collection('results').find({}).toArray();
  const nonAllowed = allDocs.filter(d => {
    const b = (d.regNo || '').slice(0, 2);
    return !['22', '23', '24', '25'].includes(b);
  });
  console.log(`Total documents in DB: ${allDocs.length}`);
  console.log(`Non-allowed batch documents (not 22, 23, 24, 25): ${nonAllowed.length}`);
  if (nonAllowed.length > 0) {
    console.log('Sample non-allowed:');
    nonAllowed.forEach(d => console.log(d.regNo, d.course, d.name, d.college));
  }
  await mongoose.disconnect();
}

check().catch(console.error);
