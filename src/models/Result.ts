import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  regNo: { type: String, required: true, unique: true },
  name: String,
  college: String,
  semester: String,
  sgpa: String,
  cgpa: String,
  status: String,
  course: String,
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
});

// Avoid OverwriteModelError in hot reload
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);
export default Result;
