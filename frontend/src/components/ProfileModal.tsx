import React, { useState, useEffect } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

export default function ProfileModal({ isOpen, onClose, userRole }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchUserInfo = async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) setUserInfo(await res.json());
        } catch (e) {}
      };
      fetchUserInfo();
    }
  }, [isOpen]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert('Password baru dan konfirmasi tidak cocok!');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      alert(data.message);
      if (res.ok) { setOldPassword(''); setNewPassword(''); setConfirmPassword(''); onClose(); }
    } catch (err) { alert('Gagal terhubung ke server'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative animate-fadeIn flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-lg font-extrabold text-[#0d3b66]">Profil & Keamanan</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 font-bold text-xl">✕</button>
        </div>
        
        <div className="flex px-5 pt-3 gap-4 border-b border-slate-200">
          <button onClick={() => setActiveTab('info')} className={`pb-2 text-sm font-bold border-b-2 ${activeTab === 'info' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400'}`}>Info User</button>
          <button onClick={() => setActiveTab('password')} className={`pb-2 text-sm font-bold border-b-2 ${activeTab === 'password' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400'}`}>Ganti Sandi</button>
        </div>

        <div className="p-5 overflow-y-auto">
          {activeTab === 'info' && userInfo && (
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</label><div className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">{userInfo.namaLengkap || '-'}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Instansi</label><div className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">{userInfo.perusahaan || '-'}</div></div>
                <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hak Akses</label><div className="text-xs font-extrabold text-blue-600 bg-blue-50 p-3 rounded-lg mt-1 border border-blue-100">{userInfo.role}</div></div>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input type="password" placeholder="Password Lama" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-slate-50 font-medium" required />
              <input type="password" placeholder="Password Baru" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-slate-50 font-medium" required />
              <input type="password" placeholder="Konfirmasi Password Baru" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 bg-slate-50 font-medium" required />
              <button type="submit" className="w-full bg-[#175390] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#114070] shadow-sm transition-all mt-4">Simpan Password Baru</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}