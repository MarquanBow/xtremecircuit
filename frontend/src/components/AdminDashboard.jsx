import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sync');
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [syncStats, setSyncStats] = useState(null);

  const [playerForm, setPlayerForm] = useState({ username: '', challonge_username: '', team_id: '' });
  const [teamForm, setTeamForm] = useState({ name: '', logo_url: '' });
  const [syncForm, setSyncForm] = useState({ tournament_id: '' });

  // 1. ROUTE PROTECTION: Boot unauthorized users back to login
  useEffect(() => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (!token || !isAdmin) {
      navigate('/login');
    }
  }, [navigate]);

  // Load teams for the dropdown
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/teams')
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(err => console.error("Could not load teams", err));
  }, []);

  const displayMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 8000);
  };

  // Helper to grab the token for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // This is what the Bouncer is looking for!
    };
  };

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Syncing with Challonge API...', type: 'loading' });
    setSyncStats(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/sync/challonge', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(syncForm)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to sync tournament");
      
      displayMessage('Bracket synchronized successfully!', 'success');
      setSyncStats(data);
      setSyncForm({ tournament_id: '' });
    } catch (error) {
      displayMessage(error.message, 'error');
      if (error.message.includes("Credentials") || error.message.includes("Access denied")) {
        setTimeout(() => navigate('/login'), 2000);
      }
    }
  };

  const handlePlayerSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Registering...', type: 'loading' });

    const payload = {
      ...playerForm,
      team_id: playerForm.team_id ? parseInt(playerForm.team_id) : null 
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/players', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to register");
      
      displayMessage('Blader registered successfully!', 'success');
      setPlayerForm({ username: '', challonge_username: '', team_id: '' });
    } catch (error) {
      displayMessage(error.message, 'error');
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Creating Team...', type: 'loading' });

    try {
      const response = await fetch('http://127.0.0.1:8000/api/teams', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(teamForm)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to create team");
      
      displayMessage('Team created successfully!', 'success');
      setTeamForm({ name: '', logo_url: '' });
      setTeams([...teams, data.team]); 
    } catch (error) {
      displayMessage(error.message, 'error');
    }
  };

  return (
    <div className="min-h-[90vh] bg-gray-950 text-gray-100 p-6 font-sans flex items-center justify-center border-t border-red-900/30">
      <div className="max-w-xl w-full bg-black rounded-xl border border-gray-800 shadow-2xl shadow-blue-900/10 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500">
              Xtreme Circuit Admin
            </h1>
            <p className="text-sm text-gray-500 tracking-widest uppercase mt-1">
              Data & Roster Management
            </p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('is_admin');
              navigate('/login');
            }}
            className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 border border-red-900/50 hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
          >
            Log Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-800 text-xs sm:text-sm font-bold tracking-widest uppercase">
          <button 
            onClick={() => {setActiveTab('sync'); setSyncStats(null); setMessage({text:'', type:''});}}
            className={`flex-1 py-4 transition-colors ${activeTab === 'sync' ? 'text-blue-500 border-b-2 border-blue-500 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sync Bracket
          </button>
          <button 
            onClick={() => {setActiveTab('player'); setSyncStats(null); setMessage({text:'', type:''});}}
            className={`flex-1 py-4 transition-colors ${activeTab === 'player' ? 'text-red-500 border-b-2 border-red-500 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Add Player
          </button>
          <button 
            onClick={() => {setActiveTab('team'); setSyncStats(null); setMessage({text:'', type:''});}}
            className={`flex-1 py-4 transition-colors ${activeTab === 'team' ? 'text-blue-300 border-b-2 border-blue-300 bg-gray-900/50' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Add Team
          </button>
        </div>

        {/* Status Message Display */}
        {message.text && (
          <div className={`p-4 mx-6 mt-6 rounded text-sm font-bold tracking-wide border-l-4 ${
            message.type === 'error' ? 'bg-red-950/50 text-red-400 border-red-600' : 
            message.type === 'success' ? 'bg-blue-950/50 text-blue-400 border-blue-500' : 
            'bg-gray-800 text-gray-400 border-gray-600'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form Container */}
        <div className="p-6">
          
          {/* SYNC TOURNAMENT FORM */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              <form onSubmit={handleSyncSubmit}>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Challonge URL Slug / ID</label>
                  <input 
                    type="text" required
                    value={syncForm.tournament_id}
                    onChange={(e) => setSyncForm({...syncForm, tournament_id: e.target.value})}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="e.g. worldbeyblade-lrd3mfj5"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all mt-4 shadow-lg shadow-blue-900/20">
                  Run Points Calculation
                </button>
              </form>

              {/* Sync Results Display */}
              {syncStats && (
                <div className="mt-6 p-4 bg-gray-900 rounded border border-gray-800">
                  <h3 className="text-blue-400 font-bold uppercase tracking-wider mb-2">Sync Report</h3>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li><span className="text-gray-500">Tournament:</span> {syncStats.tournament_name}</li>
                    <li><span className="text-gray-500">Profiles Matched:</span> {syncStats.total_players_synced}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* PLAYER REGISTRATION FORM */}
          {activeTab === 'player' && (
            <form onSubmit={handlePlayerSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                <input 
                  type="text" required
                  value={playerForm.username}
                  onChange={(e) => setPlayerForm({...playerForm, username: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Challonge Handle</label>
                <input 
                  type="text" required
                  value={playerForm.challonge_username}
                  onChange={(e) => setPlayerForm({...playerForm, challonge_username: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Team Affiliation (Optional)</label>
                <select 
                  value={playerForm.team_id}
                  onChange={(e) => setPlayerForm({...playerForm, team_id: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500 transition-colors appearance-none"
                >
                  <option value="">-- Free Agent --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all mt-4 shadow-lg shadow-red-900/20">
                Initialize Profile
              </button>
            </form>
          )}

          {/* TEAM CREATION FORM */}
          {activeTab === 'team' && (
            <form onSubmit={handleTeamSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Team Name</label>
                <input 
                  type="text" required
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Logo URL (Optional)</label>
                <input 
                  type="url"
                  value={teamForm.logo_url}
                  onChange={(e) => setTeamForm({...teamForm, logo_url: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-blue-400 transition-colors"
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all mt-4 shadow-lg shadow-blue-900/20">
                Register Squad
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}