import mongoose, { Schema, Document } from 'mongoose';

export interface IEquipment extends Document {
  namaPeralatan: string;
  lokasi: string;
  merek?: string;
  mainCategory: 'Faskampen' | 'Elban';
  subCategory?: 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara';
}

const EquipmentSchema: Schema = new Schema({
  namaPeralatan: { type: String, required: true },
  lokasi: { type: String, required: true },
  merek: { type: String, default: '' },
  mainCategory: {
    type: String,
    enum: ['Faskampen', 'Elban'],
    required: true
  },
  subCategory: {
    type: String,
    enum: ['Fasilitas IT', 'Fasilitas Penunjang Bandar Udara'],
    required: function(this: any) {
      return this.mainCategory === 'Elban';
    }
  }
}, { timestamps: true });

export default mongoose.model<IEquipment>('Equipment', EquipmentSchema);