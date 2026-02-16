// External modules
import { getAll as _getAll } from '../models/test.model.js';

export const getAll = async (req, res) => {
  try {
    const users = await _getAll();
    res.status(200).json({ data: users });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};
