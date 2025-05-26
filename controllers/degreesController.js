import Degree from '../models/degreesModel.js';

export const getAllDegrees = async (req, res) => {
  try {
    const degrees = await Degree.find().sort({ name: 1 });
    res.json(degrees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDegree = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ message: 'El nombre es obligatorio' });

    const slug = name.toLowerCase().replace(/\s+/g, '-');

    const exists = await Degree.findOne({ slug });
    if (exists) return res.status(400).json({ message: 'Esa carrera ya existe' });

    const newDegree = new Degree({ name, slug, description });
    await newDegree.save();

    res.status(201).json(newDegree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
