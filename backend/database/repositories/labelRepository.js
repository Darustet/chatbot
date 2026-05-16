import Label from '../models/label.js';

const getAllLabels = async () => {
  return await Label.find().sort({ createdAt: -1 });
};

const getLabelById = async (id) => {
  return await Label.findById(id);
};

const getLabelByName = async (name) => {
  return await Label.findOne({ name });
};

const createLabel = async (label) => {
  return await Label.create(label);
};

const updateLabel = async (id, label) => {
  return await Label.findByIdAndUpdate(id, label, {
    new: true,
    runValidators: true
  });
};

const deleteLabel = async (id) => {
  return await Label.findByIdAndDelete(id);
};

export {
  getAllLabels,
  getLabelById,
  getLabelByName,
  createLabel,
  updateLabel,
  deleteLabel
};