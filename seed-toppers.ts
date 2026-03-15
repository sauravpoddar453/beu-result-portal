import dbConnect from './src/lib/mongodb';
import Result from './src/models/Result';
import * as dotenv from 'dotenv';
dotenv.config();

async function seed() {
    await dbConnect();
    const toppers = [
        {
            regNo: '22151131001',
            name: 'Vikash Kumar',
            college: 'PURNEA COLLEGE OF ENGINEERING, PURNEA',
            semester: '6th Semester',
            sgpa: '9.42',
            cgpa: '8.85',
            status: 'PASSED',
            course: 'Computer Science and Engineering (Artificial Intelligence)'
        },
        {
            regNo: '22151131005',
            name: 'Anjali Sharma',
            college: 'PURNEA COLLEGE OF ENGINEERING, PURNEA',
            semester: '6th Semester',
            sgpa: '9.15',
            cgpa: '8.62',
            status: 'PASSED',
            course: 'Computer Science and Engineering (Artificial Intelligence)'
        },
        {
            regNo: '22151131012',
            name: 'Rahul Raj',
            college: 'PURNEA COLLEGE OF ENGINEERING, PURNEA',
            semester: '6th Semester',
            sgpa: '8.95',
            cgpa: '8.40',
            status: 'PASSED',
            course: 'Computer Science and Engineering (Artificial Intelligence)'
        }
    ];

    for (const topper of toppers) {
        await Result.findOneAndUpdate(
            { regNo: topper.regNo },
            { $set: topper },
            { upsert: true }
        );
    }
    console.log('Seed data added successfully!');
    process.exit(0);
}

seed();
