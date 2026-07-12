import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Authenticating...');

    try {
      const res = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      // Save the digital badge locally
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('is_admin', data.is_admin);
      
      navigate('/admin'); // Boot them straight into the command center
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="min-h-[90vh] bg-gray-950 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-black rounded-xl border border-gray-800 shadow-2xl shadow-blue-900/10 overflow-hidden p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]">
            System Access
          </h1>
          <p className="text-xs text-gray-500 tracking-widest uppercase mt-2">Provide Credentials</p>
        </div>

        {message && (
          <div className="p-3 mb-6 bg-red-950/50 text-red-400 border-l-4 border-red-600 rounded text-sm font-bold tracking-wide">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Network Email</label>
            <input 
              type="email" required
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Passcode</label>
            <input 
              type="password" required
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all shadow-lg shadow-blue-900/20">
            Grant Access
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500 uppercase tracking-widest font-bold">
          No ID? <Link to="/signup" className="text-red-500 hover:text-red-400 transition-colors">Establish Profile</Link>
        </div>
      </div>
    </div>
  );
}