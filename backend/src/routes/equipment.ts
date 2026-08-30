import express, { Request, Response } from 'express';
import Equipment from '../models/Equipment';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { mainCategory, subCategory } = req.query;
    
    let filter: any = {};
    if (mainCategory) filter.mainCategory = mainCategory;
    if (subCategory) filter.subCategory = subCategory;

    const equipments = await Equipment.find(filter);
    res.json(equipments);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil data fasilitas" });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { normal, rusak, keteranganRusak } = req.body;
    
    const total = Number(normal) + Number(rusak); 

    const updatedEquipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      { normal, rusak, total, keteranganRusak },
      { new: true } 
    );

    res.json(updatedEquipment);
  } catch (error) {
    res.status(500).json({ message: "Gagal memperbarui data fasilitas" });
  }
});

export default router;