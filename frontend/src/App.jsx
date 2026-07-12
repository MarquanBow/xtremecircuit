import { useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';

function App() {
  const [view, setView] = useState('leaderboard');

  return (
    <div className="bg-gray-950 min-h-screen">
      <nav className="bg-black border-b border-gray-900 p-4 flex justify-center gap-6 shadow-md shadow-red-900/10">
        <button 
          onClick={() => setView('leaderboard')}
          className={`font-bold tracking-widest uppercase text-xs px-4 py-2 rounded transition-colors ${
            view === 'leaderboard' ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          View Standings
        </button>
        <button 
          onClick={() => setView('admin')}
          className={`font-bold tracking-widest uppercase text-xs px-4 py-2 rounded transition-colors ${
            view === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Admin Portal
        </button>
      </nav>

      {view === 'leaderboard' ? <Leaderboard /> : <AdminDashboard />}
    </div>
  );
}

export default App;