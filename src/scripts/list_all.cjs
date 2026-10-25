const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await mongoose.connection.collection('results').find({}).toArray();
  console.log('All regNos and names in DB:');
  docs.forEach(d => console.log(`${d.regNo} | ${d.semester} | ${d.college} | ${d.name}`));
  await mongoose.disconnect();
}
check().catch(console.error);
