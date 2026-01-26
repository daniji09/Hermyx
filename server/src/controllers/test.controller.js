// External modules
const testModel = require("../models/test.model");

const getAll = async (req, res) => {
  try {
    const users = await testModel.getAll();
    res.status(200).json({ data: users });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

module.exports = { getAll };
