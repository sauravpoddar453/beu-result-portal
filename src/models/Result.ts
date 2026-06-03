import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  regNo: { type: String, required: true },
  name: String,
  fatherName: String,
  motherName: String,
  college: String,
  semester: String,
  sgpa: mongoose.Schema.Types.Mixed,
  cgpa: mongoose.Schema.Types.Mixed,
  status: String,
  course: String,
  theorySubjects: Array,
  practicalSubjects: Array,
  allSgpa: Array,
  subjects: [
    {
      code: String,
      name: String,
      grade: String,
      credit: String,
      point: Number,
      max: Number,
    },
  ],
  lastUpdated: { type: Date, default: Date.now },
}, { strict: false });

resultSchema.index({ regNo: 1, semester: 1 }, { unique: true });

// Avoid OverwriteModelError in hot reload
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);
export default Result;
