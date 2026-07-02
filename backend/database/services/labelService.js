import {
  getLabelIdByName,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel
} from '../repositories/labelRepository.js';

const findLabelIdByName = async (name) => {
  return await getLabelIdByName(name);
};

const findLabelById = async (id) => {
  return await getLabelById(id);
};

const addLabel = async (name) => {
  return await createLabel(name);
};

const modifyLabel = async (id, name) => {
  return await updateLabel(id, name);
};

const removeLabel = async (id) => {
  return await deleteLabel(id);
};

export {
  findLabelIdByName,
  findLabelById,
  addLabel,
  modifyLabel,
  removeLabel
};