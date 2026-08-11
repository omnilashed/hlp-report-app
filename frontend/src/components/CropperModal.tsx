import Cropper from 'react-easy-crop';

interface CropperModalProps {
  cropQueue: {url: string, slotIndex: number}[];
  setCropQueue: React.Dispatch<React.SetStateAction<{url: string, slotIndex: number}[]>>;
  crop: { x: number, y: number };
  setCrop: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  cropAspect: number;
  setCropAspect: React.Dispatch<React.SetStateAction<number>>;
  setCroppedAreaPixels: React.Dispatch<React.SetStateAction<any>>;
  handleSaveCrop: () => void;
}

export default function CropperModal({
  cropQueue, setCropQueue, crop, setCrop, zoom, setZoom,
  cropAspect, setCropAspect, setCroppedAreaPixels, handleSaveCrop
}: CropperModalProps) {
  if (cropQueue.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[85vh] animate-fadeIn">
        <div className="p-4 border-b border-slate-100 text-center font-extrabold text-slate-800 flex justify-between items-center">
          <span>Sesuaikan Foto ({cropQueue.length} antrean)</span>
          <button onClick={() => { setCropQueue([]); setCrop({x:0, y:0}); setZoom(1); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition-all">✕</button>
        </div>
        
        <div className="flex-1 relative bg-slate-900">
          <Cropper image={cropQueue[0].url} crop={crop} zoom={zoom} aspect={cropAspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)} />
        </div>
        
        <div className="p-5 bg-white flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pilih Bentuk Bingkai</span>
            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
              <button onClick={() => setCropAspect(1)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${cropAspect === 1 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Kotak 1:1</button>
              <button onClick={() => setCropAspect(3/4)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${cropAspect === 3/4 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Potrait 3:4</button>
              <button onClick={() => setCropAspect(4/3)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${cropAspect === 4/3 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Lebar 4:3</button>
              <button onClick={() => setCropAspect(16/9)} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${cropAspect === 16/9 ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-slate-200'}`}>Layar 16:9</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Zoom</span>
            <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-blue-600" />
          </div>
          
          <div className="flex gap-3 mt-1">
            <button onClick={() => { setCropQueue(prev => prev.slice(1)); setCrop({x:0,y:0}); setZoom(1); }} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">Lewati</button>
            <button onClick={handleSaveCrop} className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Simpan Potongan</button>
          </div>
        </div>
      </div>
    </div>
  );
}