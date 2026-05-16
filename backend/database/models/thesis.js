import mongoose from 'mongoose';

const thesisSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: String,
    year: Number,
    university: String,
    university_code: String,
    handle: String,
    link: { type: String, unique: true, sparse: true },
    thesisId: String,
    abstract_text: String,
    rule_score: Number,
    rule_reasons: String,
    openAI_decision: String,
    openAI_evidence: String
  },
  { timestamps: true }
);

export default mongoose.model('Thesis', thesisSchema);