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

const getAbstractByLink = async (link) => {
  const thesis = await Thesis.findOne({ link }, 'abstract_text');
  return thesis ? thesis.abstract_text : null;
}

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
  getAbstractByLink,
  createThesis,
  updateThesis,
  deleteThesis
};