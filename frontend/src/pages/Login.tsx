import React, { useState } from 'react';

interface LoginProps {
  onLogin: (role: 'ADMIN' | 'OFFICE' | 'SUPERVISOR' | 'ASMEN' | 'GUEST', username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
 
  const [showPassword, setShowPassword] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        onLogin(data.role as any, data.username);
      } else {
        alert(data.message || 'Username atau Password salah!');
      }
    } catch (err) {
      alert('Tidak dapat terhubung ke server backend.');
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans flex">
      <div className="absolute inset-0 z-0">
        <img src="/halim.jpg" alt="" className="w-full h-full object-cover" />
      </div>
    
      <div className="absolute top-0 left-0 h-full w-full md:w-[75%] lg:w-[65%] bg-white z-10 shadow-2xl md:[clip-path:polygon(0_0,75%_0,100%_50%,75%_100%,0_100%)]"></div>
  
      <div className="relative z-20 w-full h-full flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 max-w-2xl animate-fadeIn">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">
    
          <div className="flex justify-center mb-8">
            <img src="/hlp.png" alt="" className="w-48 object-contain" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-[#0d3b66] tracking-tight mb-2 text-center leading-snug">
            Laporan Kegiatan Harian<br />ELIT KSO
          </h1>
          <p className="text-sm text-slate-500 font-medium mb-8 text-center">
            Welcome Back, Please login to your account
          </p>
          
          <form onSubmit={handleLogin} className="w-full flex flex-col">
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 mb-2 tracking-widest uppercase">
                  Username
                </label>
                <input 
                  type="text" 
                  value={loginUsername} 
                  onChange={(e) => setLoginUsername(e.target.value)} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:border-[#175390] focus:ring-4 focus:ring-[#175390]/10 transition-all shadow-sm" 
                  placeholder="Masukkan username Anda" 
                  required 
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 mb-2 tracking-widest uppercase">
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 placeholder-slate-300 outline-none focus:bg-white focus:border-[#175390] focus:ring-4 focus:ring-[#175390]/10 transition-all shadow-sm tracking-wide" 
                    placeholder="••••••••••••" 
                    required 
                  />
          
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#175390] transition-colors p-2"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    )}
                  </button>
                </div>
 
                <div className="flex justify-end mt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(true)} // <-- Memicu Pop-up Custom
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition-all"
                  >
                    Lupa Password?
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-[#175390] hover:bg-[#114070] text-white font-extrabold rounded-2xl shadow-lg shadow-blue-900/30 transition-all transform hover:-translate-y-0.5 text-xs tracking-widest uppercase">
              Log In
            </button>
          </form>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center transform transition-all scale-100">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-[#175390] mb-5 shadow-inner">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            
            <h3 className="text-xl font-extrabold text-slate-800 mb-3">Lupa Password?</h3>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              Gagal masuk? Silakan hubungi <b className="text-slate-700">Administrator</b> sistem (Pusat HLP) untuk melakukan proses *reset* password akun Anda.
            </p>
            
            <button 
              onClick={() => setShowForgotModal(false)}
              className="w-full py-3.5 bg-[#175390] hover:bg-[#114070] text-white font-extrabold rounded-xl shadow-md transition-all text-sm tracking-wide"
            >
              Mengerti, Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}