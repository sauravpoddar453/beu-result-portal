const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const col = mongoose.connection.collection('results');
  const count = await col.countDocuments();
  console.log('TOTAL_RECORDS:', count);

  const byBatch = await col.aggregate([
    { $project: { batch: { $substr: ['$regNo', 0, 2] } } },
    { $group: { _id: '$batch', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('BY_BATCH:', JSON.stringify(byBatch));

  const bySem = await col.aggregate([
    { $group: { _id: '$semester', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('BY_SEM:', JSON.stringify(bySem));

  const byCollege = await col.aggregate([
    { $group: { _id: '$college', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();
  console.log('COLLEGES_COUNT:', byCollege.length);
  console.log('TOP_5_COLLEGES:', JSON.stringify(byCollege.slice(0, 5)));

  const latest = await col.find().sort({ _id: -1 }).limit(3).project({ regNo: 1, name: 1, semester: 1, college: 1, course: 1, sgpa: 1 }).toArray();
  console.log('LATEST:', JSON.stringify(latest));

  await mongoose.disconnect();
}
run().catch(console.error);
