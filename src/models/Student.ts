import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
    name: String,
    rollNo: String,
    branch: String,
    semester: Number,
    marks: Number
});

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);
export default Student;
