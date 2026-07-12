import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Signup() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("SENDING THIS EXACT PAYLOAD", form)
    setMessage({ text: 'Initializing profile...', type: 'loading' });

    try {
      const res = await fetch('http://127.0.0.1:8000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Failed to create account");

      setMessage({ text: 'Profile established! Routing to terminal...', type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-[90vh] bg-gray-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-black rounded-xl border border-gray-800 shadow-2xl shadow-red-900/10 overflow-hidden p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]">
            Join the Circuit
          </h1>
          <p className="text-xs text-gray-500 tracking-widest uppercase mt-2">Create Organizer ID</p>
        </div>

        {message.text && (
          <div className={`p-3 mb-6 rounded text-sm font-bold tracking-wide border-l-4 ${
            message.type === 'error' ? 'bg-red-950/50 text-red-400 border-red-600' : 
            'bg-blue-950/50 text-blue-400 border-blue-500'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Network Email</label>
            <input 
              type="email" required
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Passcode</label>
            <input 
              type="password" required
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all shadow-lg shadow-red-900/20">
            Register Admin
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 uppercase tracking-widest font-bold">
          Already verified? <Link to="/login" className="text-blue-500 hover:text-blue-400 transition-colors">Initialize Login</Link>
        </div>
      </div>
    </div>
  );
}