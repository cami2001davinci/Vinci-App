import express from 'express';
import categories from '../src/config/categories.js';
import { getLinkPreview } from '../controllers/metaController.js';

const router = express.Router();

router.get('/categories', (req, res) => {
  res.json({
    items: categories,
    ui: { includeAllOption: true, allValue: '' }
  });
});

router.get('/links/preview', getLinkPreview);



export default router;
