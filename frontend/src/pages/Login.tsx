import React, { useState } from 'react';

interface LoginProps {
  onLogin: (role: 'OFFICE' | 'SUPERVISOR' | 'ASMEN' | 'GUYS', username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername === 'office' && loginPassword === 'office123') onLogin('OFFICE', loginUsername);
    else if (loginUsername === 'spv' && loginPassword === 'spv123') onLogin('SUPERVISOR', loginUsername);
    else if (loginUsername === 'asmen' && loginPassword === 'asmen123') onLogin('ASMEN', loginUsername);
    else if (loginUsername === 'guest' && loginPassword === 'guest123') onLogin('GUYS', loginUsername);
    else alert('Username atau Password salah!');
  };

  return (
    <div className="relative w-full h-screen bg-slate-900 overflow-hidden font-sans flex">
      <div className="absolute inset-0 z-0">
        <img 
          src="/halim.jpg" 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="absolute top-0 left-0 h-full w-full md:w-[75%] lg:w-[65%] bg-white z-10 shadow-2xl md:[clip-path:polygon(0_0,75%_0,100%_50%,75%_100%,0_100%)]">
      </div>

      <div className="relative z-20 w-full h-full flex flex-col justify-center px-8 sm:px-16 md:px-24 lg:px-32 max-w-2xl animate-fadeIn">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center">
          
          <div className="flex justify-center mb-2">
            <img src="/hlp.png" alt="" className="w-60 object-contain" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-[#0d3b66] tracking-tight mb-2 text-center leading-snug">
            Laporan Kegiatan Harian<br />ELIT KSO
          </h1>
          <p className="text-sm text-slate-500 font-medium mb-10 text-center">
            Welcome Back, Please login to your account
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col">
            <div className="border border-slate-200 rounded-md bg-white overflow-hidden mb-8 shadow-sm">
              <div className="p-4 sm:p-5 border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wide uppercase">
                  Username
                </label>
                <input 
                  type="text" 
                  value={loginUsername} 
                  onChange={(e) => setLoginUsername(e.target.value)} 
                  className="w-full bg-transparent text-sm font-bold text-slate-800 placeholder-slate-300 outline-none" 
                  placeholder="Masukkan username"
                  required 
                />
              </div>

              <div className="p-4 sm:p-5 hover:bg-blue-50/50 transition-colors relative">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 tracking-wide uppercase">
                  Password
                </label>
                <input 
                  type="password" 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                  className="w-full bg-transparent text-sm font-bold text-slate-800 placeholder-slate-300 outline-none tracking-widest" 
                  placeholder="••••••••••••"
                  required 
                />
                <div className="absolute right-5 top-[55%] text-slate-400">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 bg-[#175390] hover:bg-[#114070] text-white font-extrabold rounded-md shadow-md shadow-blue-900/20 transition-all transform hover:-translate-y-0.5 text-xs tracking-widest uppercase"
            >
              Log In
            </button>
          </form>
          
        </div>
      </div>
    </div>
  );
}