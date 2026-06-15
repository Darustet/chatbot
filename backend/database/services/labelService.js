import {
  getLabelIdByName,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel
} from '../repositories/labelRepository.js';

const findLabelIdByName = (name) => {
  return getLabelIdByName(name);
};

const findLabelById = (id) => {
  return getLabelById(id);
};

const addLabel = (name) => {
  return createLabel(name);
};

const modifyLabel = (id, name) => {
  return updateLabel(id, name);
};

const removeLabel = (id) => {
  deleteLabel(id);
};

export {
  findLabelIdByName,
  findLabelById,
  addLabel,
  modifyLabel,
  removeLabel
};