import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const resultSchema = new mongoose.Schema({
    regNo: { type: String, required: true, unique: true },
    name: String,
    college: String,
    semester: String,
    sgpa: String,
    cgpa: String,
    status: String,
    subjects: [
        {
            code: String,
            name: String,
            grade: String,
            credit: String,
            point: Number,
            max: Number
        }
    ],
    lastUpdated: { type: Date, default: Date.now }
});

const Result = mongoose.model('Result', resultSchema);

const data = [
    {
        "regNo": "22151131015",
        "name": "ASEEM RAJ",
        "college": "PURNEA COLLEGE OF ENGINEERING, PURNEA",
        "semester": "6th Semester",
        "sgpa": "6.3",
        "cgpa": "7.23",
        "status": "FAIL:151603",
        "subjects": [
            { "code": "151601", "name": "Machine Learning", "grade": "D", "credit": "4", "point": 50 },
            { "code": "151602", "name": "Automata Theory and Compiler Design", "grade": "B", "credit": "3", "point": 76 },
            { "code": "151603", "name": "Ad hoc & Network Sensors", "grade": "F", "credit": "3", "point": 27 },
            { "code": "151604", "name": "AI and Ethics", "grade": "C", "credit": "1", "point": 67 },
            { "code": "151609", "name": "Network Security", "grade": "D", "credit": "3", "point": 56 },
            { "code": "151615", "name": "E-Commerce and ERP", "grade": "B", "credit": "3", "point": 72 },
            { "code": "151601P", "name": "Machine Learning Lab", "grade": "A", "credit": "2", "point": 42 },
            { "code": "151603P", "name": "Ad hoc & Network Sensors Lab", "grade": "A", "credit": "2", "point": 43 },
            { "code": "151606P", "name": "NPTEL Course-II Lab", "grade": "D", "credit": "2", "point": 51 }
        ]
    },
    {
        "regNo": "22151131026",
        "name": "SAURAV PODDAR",
        "college": "PURNEA COLLEGE OF ENGINEERING, PURNEA",
        "semester": "6th Semester",
        "sgpa": "8.75",
        "cgpa": "8.32",
        "status": "PASSED",
        "subjects": [
            { "code": "151601", "name": "Machine Learning", "grade": "A", "credit": "4", "point": 70 }
        ]
    }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        for (const item of data) {
            await Result.findOneAndUpdate({ regNo: item.regNo }, item, { upsert: true });
            console.log(`Inserted/Updated result for ${item.regNo}`);
        }

        console.log("Seeding completed");
        process.exit(0);
    } catch (err) {
        console.error("Error during seeding:", err);
        process.exit(1);
    }
}

seed();
