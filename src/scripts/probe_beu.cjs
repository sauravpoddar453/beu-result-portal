const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const mongoose = require('mongoose');
require('dotenv').config();

async function probe() {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await mongoose.connection.collection('results').find({ regNo: '22151131001' }).toArray();
  console.log('Semesters for 22151131001:', docs.map(d => ({
    sem: d.semester,
    exam: d.examName,
    held: d.examHeld,
    sgpa: d.sgpa,
    cgpa: d.cgpa
  })));
  await mongoose.disconnect();
}

probe().catch(console.error);
