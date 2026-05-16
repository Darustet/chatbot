import Thesis from '../models/thesis.js';

const getAllTheses = async () => {
  return await Thesis.find().sort({ createdAt: -1 });
};

const getThesisById = async (id) => {
  return await Thesis.findById(id);
};

const getThesisByLink = async (link) => {
  return await Thesis.findOne({ link });
};

const createThesis = async (thesis) => {
  return await Thesis.create(thesis);
};

const updateThesis = async (id, thesis) => {
  return await Thesis.findByIdAndUpdate(id, thesis, {
    new: true,
    runValidators: true
  });
};

const deleteThesis = async (id) => {
  return await Thesis.findByIdAndDelete(id);
};

export {
  getAllTheses,
  getThesisById,
  getThesisByLink,
  createThesis,
  updateThesis,
  deleteThesis
};