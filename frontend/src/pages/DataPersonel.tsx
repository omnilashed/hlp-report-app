import { useState, useEffect } from 'react';

interface DataPersonelProps {
  userRole: string;
}

export default function DataPersonel({ userRole }: DataPersonelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newUser, setNewUser] = useState({
    namaLengkap: '', username: '', password: 'Elit2026!', nik: '', noWA: '', perusahaan: 'APINDO', role: 'OFFICE'
  });

  // Modal serbaguna: bisa untuk konfirmasi (ada tombol Batal & OK) 
  // atau sekadar pemberitahuan sukses (hanya ada tombol OK)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    dangerMode: false,
    isNotificationOnly: false, // <-- Tambahan agar bisa jadi sekadar notif sukses
    onConfirm: () => {}
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const userArray = Array.isArray(data) ? data : (data.data || data.users || []);
        setUsers(userArray);
      }
    } catch (e) {
      console.error("Gagal mengambil data:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // Fungsi pembantu untuk memunculkan notifikasi sukses/error
  const showNotification = (title: string, message: string, dangerMode = false) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      dangerMode,
      isNotificationOnly: true,
      onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (userRole !== 'ADMIN') return;
    setConfirmDialog({
      isOpen: true,
      title: currentStatus ? 'Menonaktifkan Akun' : 'Mengaktifkan Akun',
      message: `Yakin ingin ${currentStatus ? 'Menonaktifkan' : 'Mengaktifkan'} akun ini?`,
      dangerMode: currentStatus,
      isNotificationOnly: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/users/${id}/toggle-status`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } });
          const data = await res.json();
          if (res.ok) {
            setUsers((prev: any[]) => prev.map(u => u._id === id ? { ...u, isActive: data.isActive } : u));
            setSelectedUser((prev: any) => prev && prev._id === id ? { ...prev, isActive: data.isActive } : prev);
          } else { showNotification('Gagal', data.message, true); }
        } catch (err) { showNotification('Error', 'Gagal menghubungi server', true); }
      }
    });
  };

  const handleChangeRole = async (id: string, username: string, newRole: string) => {
    if (userRole !== 'ADMIN') return;
    setConfirmDialog({
      isOpen: true,
      title: 'Ubah Hak Akses',
      message: `Ubah hak akses '${username}' menjadi ${newRole}?`,
      dangerMode: false,
      isNotificationOnly: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/users/${id}/change-role`, { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ newRole })
          });
          const data = await res.json();
          if (res.ok) {
            setUsers((prev: any[]) => prev.map(u => u._id === id ? { ...u, role: data.role } : u));
            setSelectedUser((prev: any) => prev && prev._id === id ? { ...prev, role: data.role } : prev);
            showNotification('Berhasil', 'Hak akses berhasil diperbarui.');
          } else { showNotification('Gagal', data.message, true); }
        } catch (err) { showNotification('Error', 'Gagal menghubungi server', true); }
      }
    });
  };

  const handleUpdateWA = async (id: string, noWA: string) => {
    if (userRole !== 'ADMIN') return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/users/${id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ noWA: noWA })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev: any[]) => prev.map(u => u._id === id ? { ...u, noWA: noWA } : u));
        setSelectedUser((prev: any) => prev && prev._id === id ? { ...prev, noWA: noWA } : prev);
        showNotification('Berhasil', 'Nomor WA berhasil diperbarui!');
      } else { showNotification('Gagal', data.message, true); }
    } catch (err) { showNotification('Error', 'Gagal menyimpan nomor WA ke server', true); }
  };

  const handleResetPassword = async (username: string) => {
    if (userRole !== 'ADMIN') return;
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Password',
      message: `Yakin mereset password '${username}' ke Elit2026! ?`,
      dangerMode: true,
      isNotificationOnly: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const res = await fetch('/api/users/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targetUsername: username })
          });
          const data = await res.json();
          showNotification('Berhasil', data.message);
        } catch (err) { showNotification('Error', 'Gagal terhubung ke server', true); }
      }
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (res.ok) {
        setUsers([...users, data]);
        setIsAddModalOpen(false);
        setNewUser({ namaLengkap: '', username: '', password: 'Elit2026!', nik: '', noWA: '', perusahaan: 'APINDO', role: 'OFFICE' });
        showNotification('Berhasil', 'User berhasil ditambahkan!');
      } else { showNotification('Gagal', data.message, true); }
    } catch (err) { showNotification('Error', 'Koneksi gagal ke server', true); }
  };

  const handleSoftDelete = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Sementara',
      message: 'Hapus sementara akun ini? Akun akan dinonaktifkan dan bisa dihapus permanen otomatis setelah 30 hari.',
      dangerMode: true,
      isNotificationOnly: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ isDeleted: true, deletedAt: new Date().toISOString(), isActive: false })
          });
          if (res.ok) fetchUsers();
          else showNotification('Gagal', 'Gagal menghapus sementara.', true);
        } catch (e) { showNotification('Error', 'Server error', true); }
      }
    });
  };

  const handleRestore = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    setConfirmDialog({
      isOpen: true,
      title: 'Pulihkan Akun',
      message: 'Pulihkan akun ini? Akun akan kembali normal.',
      dangerMode: false,
      isNotificationOnly: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ isDeleted: false, deletedAt: null })
          });
          if (res.ok) fetchUsers();
          else showNotification('Gagal', 'Gagal memulihkan akun.', true);
        } catch (e) { showNotification('Error', 'Server error', true); }
      }
    });
  };

  const handleForceDelete = async (id: string) => {
    if (userRole !== 'ADMIN') return;
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Permanen',
      message: 'PERINGATAN: Anda akan menghapus akun ini secara PERMANEN. Lanjutkan?',
      dangerMode: true,
      isNotificationOnly: false,
      onConfirm: async () => {
        setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }));
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) fetchUsers();
          else showNotification('Gagal', 'Gagal menghapus permanen.', true);
        } catch (e) { showNotification('Error', 'Server error', true); }
      }
    });
  };

  const getSisaHari = (deletedAt: string) => {
    if (!deletedAt) return 0;
    const expiredDate = new Date(deletedAt);
    expiredDate.setDate(expiredDate.getDate() + 30);
    const sisa = Math.ceil((expiredDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return sisa > 0 ? sisa : 0;
  };

  const openUpdateModal = (user: any) => {
    setSelectedUser({ ...user, noWA: user.noWA || '' }); 
    setIsUpdateModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    (u.namaLengkap || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (u.nik || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-50 text-purple-600 border-transparent';
      case 'SUPERVISOR': return 'bg-blue-50 text-blue-600 border-transparent';
      case 'ASMEN': return 'bg-amber-50 text-amber-600 border-transparent';
      default: return 'bg-emerald-50 text-emerald-600 border-transparent';
    }
  };

  const getGradient = (str: string) => {
    const colors = ['from-blue-500 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-purple-500 to-pink-500', 'from-rose-400 to-red-500'];
    return colors[str.length % colors.length];
  };

  return (
    <div className="bg-[#fafafa] w-full min-h-full rounded-[2rem] border border-slate-200 shadow-sm flex flex-col font-sans">
      
      <div className="p-8 border-b border-slate-200 bg-white rounded-t-[2rem]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Personnel Management</h1>
            {userRole === 'ADMIN' && (
              <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">
                Admin Only
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Search personnel..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            {userRole === 'ADMIN' && (
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-bold rounded-lg shadow-sm whitespace-nowrap transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Personnel
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-8 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-[#2563eb] rounded-full animate-spin"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-medium">No personnel found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredUsers.map(u => {
              const isSuspended = u.isDeleted;
              const sisaHari = u.deletedAt ? getSisaHari(u.deletedAt) : 0;

              return (
                <div key={u._id} className={`bg-white border border-slate-200 rounded-2xl p-6 flex flex-col hover:border-slate-300 hover:shadow-md transition-all shadow-sm ${isSuspended ? 'opacity-80 bg-rose-50/20' : ''}`}>
                  
                  <div className="flex justify-between items-start mb-5">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-tr ${isSuspended ? 'from-slate-400 to-slate-500 grayscale' : getGradient(u.username)} flex items-center justify-center text-white font-bold text-xl shadow-inner`}>
                      {(u.namaLengkap || u.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {isSuspended ? 'SUSPENDED' : (u.isActive ? 'ACTIVE' : 'INACTIVE')}
                      </span>
                      <button 
                        onClick={() => handleToggleStatus(u._id, u.isActive)}
                        disabled={userRole !== 'ADMIN' || u.role === 'ADMIN' || isSuspended}
                        className={`w-11 h-6 rounded-full p-1 transition-colors ${u.isActive && !isSuspended ? 'bg-[#10b981]' : 'bg-slate-200'} ${(userRole === 'ADMIN' && u.role !== 'ADMIN' && !isSuspended) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-70'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${u.isActive && !isSuspended ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>

                  <h3 className={`font-extrabold text-lg mb-0.5 truncate ${isSuspended ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                    {u.namaLengkap || u.username}
                  </h3>
                  <p className="text-sm text-slate-500 mb-2 truncate">{u.username.toLowerCase()}@elit.com</p>
                  
                  <p className="text-[11px] font-bold text-blue-600 mb-4 bg-blue-50 px-2.5 py-1 rounded-md inline-block w-max border border-blue-100">
                    WA: {u.noWA ? u.noWA : 'Belum ditambahkan'}
                  </p>

                  <div className="mb-6 flex flex-wrap gap-2">
                    <span className={`px-2.5 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${getRoleBadgeClass(u.role)}`}>
                      {u.role}
                    </span>
                    {isSuspended && (
                      <span className="px-2.5 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border bg-rose-100 text-rose-700 border-rose-200">
                        Menunggu Dihapus ({sisaHari} Hari)
                      </span>
                    )}
                  </div>

                  <div className="mt-auto flex gap-2">
                    {isSuspended ? (
                      <>
                        <button onClick={() => handleRestore(u._id)} disabled={userRole !== 'ADMIN'} className="flex-1 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50">Pulihkan</button>
                        <button onClick={() => handleForceDelete(u._id)} disabled={userRole !== 'ADMIN'} className="flex-1 py-2.5 border border-rose-200 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50">Hapus Permanen</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleResetPassword(u.username)} disabled={userRole !== 'ADMIN' || u.role === 'ADMIN'} className="flex-1 flex items-center justify-center gap-2 py-2 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg> Reset Pass
                        </button>
                        <button onClick={() => openUpdateModal(u)} disabled={userRole !== 'ADMIN' || u.role === 'ADMIN'} className="w-10 h-10 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleSoftDelete(u._id)} disabled={userRole !== 'ADMIN' || u.role === 'ADMIN'} className="w-10 h-10 flex items-center justify-center border border-rose-200 rounded-xl text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative animate-fadeIn flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                Add New User
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-4">Identity Information</h3>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input type="text" required value={newUser.namaLengkap} onChange={e=>setNewUser({...newUser, namaLengkap: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Username</label>
                    <input type="text" required value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Nomor WhatsApp (Cth: 0812...)</label>
                    <input type="text" value={newUser.noWA} onChange={e=>setNewUser({...newUser, noWA: e.target.value})} placeholder="Opsional..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">NIK / ID</label>
                    <input type="text" value={newUser.nik} onChange={e=>setNewUser({...newUser, nik: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  </div>
                </div>
                
                <div className="space-y-5">
                  <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block mb-4">Appointment Details</h3>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Unit Kerja / Perusahaan</label>
                    <select required value={newUser.perusahaan} onChange={e=>setNewUser({...newUser, perusahaan: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition-all">
                      <option value="APINDO">APINDO</option>
                      <option value="IASS">IASS</option>
                      <option value="NTI">NTI</option>
                      <option value="MANAJEMEN">MANAJEMEN</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Account Level (Role)</label>
                    <select required value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white cursor-pointer transition-all">
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPERVISOR">SUPERVISOR</option>
                      <option value="ASMEN">ASMEN</option>
                      <option value="OFFICE">OFFICE</option>
                      <option value="GUEST">GUEST</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-10 flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-[#2563eb] text-white text-sm font-bold rounded-xl hover:bg-[#1d4ed8] transition-colors shadow-sm shadow-blue-500/30">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {isUpdateModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative animate-fadeIn flex flex-col overflow-hidden border border-slate-200">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Update Account</h2>
                <p className="text-[11px] text-blue-600 mt-1 font-bold uppercase tracking-wider">{selectedUser.namaLengkap || selectedUser.username}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nomor WhatsApp</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={selectedUser.noWA} 
                    onChange={(e) => setSelectedUser({...selectedUser, noWA: e.target.value})}
                    placeholder="08123456..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                  />
                  <button 
                    onClick={() => handleUpdateWA(selectedUser._id, selectedUser.noWA)}
                    className="px-4 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 font-bold rounded-xl text-xs transition-all border border-emerald-100"
                  >
                    Simpan WA
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Account Role / Level</label>
                <div className="relative">
                  <select 
                    value={selectedUser.role} 
                    onChange={(e) => handleChangeRole(selectedUser._id, selectedUser.username, e.target.value)}
                    disabled={userRole !== 'ADMIN' || selectedUser.role === 'ADMIN'}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-100 cursor-pointer appearance-none"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPERVISOR">SUPERVISOR</option>
                    <option value="ASMEN">ASMEN</option>
                    <option value="OFFICE">OFFICE</option>
                    <option value="GUEST">GUEST</option>
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 block">Position Assignment</label>
                  <p className="text-xs text-slate-700 font-bold">{selectedUser.isActive ? 'Active (Allowed to login)' : 'OFF (Login disabled)'}</p>
                </div>
                <button 
                  onClick={() => handleToggleStatus(selectedUser._id, selectedUser.isActive)}
                  disabled={userRole !== 'ADMIN' || selectedUser.role === 'ADMIN'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${selectedUser.isActive ? 'bg-[#10b981]' : 'bg-slate-300'} disabled:opacity-50`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${selectedUser.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {userRole === 'ADMIN' && selectedUser.role !== 'ADMIN' && (
                <div className="pt-2">
                  <button onClick={() => handleResetPassword(selectedUser.username)} className="w-full py-3.5 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 text-xs font-bold rounded-xl transition-colors">
                    Force Reset Password to 'Elit2026!'
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end">
              <button onClick={() => setIsUpdateModalOpen(false)} className="w-full py-3.5 bg-[#2563eb] text-white text-sm font-bold rounded-xl hover:bg-[#1d4ed8] transition-colors shadow-sm shadow-blue-500/30">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 shadow-inner ${confirmDialog.dangerMode ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#2563eb]'}`}>
              {confirmDialog.isNotificationOnly && !confirmDialog.dangerMode ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 w-full">
              {!confirmDialog.isNotificationOnly && (
                <button 
                  onClick={() => setConfirmDialog((prev: any) => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
              )}
              <button 
                onClick={confirmDialog.onConfirm}
                className={`flex-1 py-3 text-white text-sm font-bold rounded-xl shadow-md transition-colors ${confirmDialog.dangerMode ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30' : 'bg-[#2563eb] hover:bg-[#1d4ed8] shadow-blue-500/30'}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}