const https = require('https');

https.get('https://beu-bih.ac.in/backend/v1/result/sem-get', { rejectUnauthorized: false }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    const btech = json.find(c => c.courseName.toLowerCase().includes('b.tech'));
    for (let sem = 1; sem <= 8; sem++) {
      const semExams = btech.exams.filter(e => e.semId === sem);
      console.log(`=== SEMESTER ${sem} (${semExams.length} exams) ===`);
      semExams.forEach(e => {
        console.log(`  id:${e.id} | ${e.examName} | batchYear:${e.batchYear} | held:${e.examHeld} | examId:${e.examId} | session:${e.session}`);
      });
    }
  });
});
