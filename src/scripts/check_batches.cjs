const mongoose = require('mongoose');
require('dotenv').config();

async function checkBatches() {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await mongoose.connection.collection('results').find({}).toArray();
  console.log('Total documents in DB:', docs.length);
  const batches = {};
  const courses = {};
  docs.forEach(d => {
    const b = (d.regNo || '').slice(0, 2);
    batches[b] = (batches[b] || 0) + 1;
    const c = d.course || 'B.Tech';
    courses[c] = (courses[c] || 0) + 1;
  });
  console.log('Batches:', batches);
  console.log('Courses:', courses);
  await mongoose.disconnect();
}

checkBatches().catch(console.error);
