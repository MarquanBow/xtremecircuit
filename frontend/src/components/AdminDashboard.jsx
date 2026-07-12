import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('sync'); // 'sync', 'player', or 'team'
  const [teams, setTeams] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [syncStats, setSyncStats] = useState(null); // To hold tournament sync results

  // Form States
  const [playerForm, setPlayerForm] = useState({ username: '', challonge_username: '', team_id: '' });
  const [teamForm, setTeamForm] = useState({ name: '', logo_url: '' });
  const [syncForm, setSyncForm] = useState({ tournament_id: '' });

  // Load teams for the dropdown on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/teams')
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(err => console.error("Could not load teams", err));
  }, []);

  const displayMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 8000); // Auto-clear after 8 seconds
  };

  // --- API HANDLERS ---

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Syncing with Challonge API...', type: 'loading' });
    setSyncStats(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/sync/challonge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncForm)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to sync tournament");
      
      displayMessage('Bracket synchronized successfully!', 'success');
      setSyncStats(data);
      setSyncForm({ tournament_id: '' });
    } catch (error) {
      displayMessage(error.message, 'error');
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  // --- UI RENDER ---

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans flex items-center justify-center">
      <div className="max-w-xl w-full bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
          <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Xtreme Circuit Admin
          </h1>
          <p className="text-sm text-zinc-500 tracking-widest uppercase mt-1">
            Data & Roster Management
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 text-xs sm:text-sm font-bold tracking-widest uppercase">
          <button 
            onClick={() => {setActiveTab('sync'); setSyncStats(null); setMessage({text:'', type:''});}}
            className={`flex-1 py-4 transition-colors ${activeTab === 'sync' ? 'text-purple-400 border-b-2 border-purple-400 bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Sync Bracket
          </button>
          <button 
            onClick={() => {setActiveTab('player'); setSyncStats(null); setMessage({text:'', type:''});}}
            className={`flex-1 py-4 transition-colors ${activeTab === 'player' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Add Player
          </button>
          <button 
            onClick={() => {setActiveTab('team'); setSyncStats(null); setMessage({text:'', type:''});}}
            className={`flex-1 py-4 transition-colors ${activeTab === 'team' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-zinc-800/30' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Add Team
          </button>
        </div>

        {/* Status Message Display */}
        {message.text && (
          <div className={`p-4 mx-6 mt-6 rounded text-sm font-bold tracking-wide border-l-4 ${
            message.type === 'error' ? 'bg-red-900/20 text-red-400 border-red-500' : 
            message.type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500' : 
            'bg-zinc-800 text-zinc-400 border-zinc-600'
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
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Challonge URL Slug / ID</label>
                  <input 
                    type="text" required
                    value={syncForm.tournament_id}
                    onChange={(e) => setSyncForm({...syncForm, tournament_id: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-purple-500 transition-colors"
                    placeholder="e.g. worldbeyblade-lrd3mfj5"
                  />
                  <p className="text-xs text-zinc-600 mt-2 font-mono">Format: subdomain-slug OR slug</p>
                </div>

                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all mt-4">
                  Run Points Calculation
                </button>
              </form>

              {/* Sync Results Display */}
              {syncStats && (
                <div className="mt-6 p-4 bg-zinc-950 rounded border border-zinc-800">
                  <h3 className="text-emerald-400 font-bold uppercase tracking-wider mb-2">Sync Report</h3>
                  <ul className="text-sm space-y-1 text-zinc-300">
                    <li><span className="text-zinc-500">Tournament:</span> {syncStats.tournament_name}</li>
                    <li><span className="text-zinc-500">Profiles Matched:</span> {syncStats.total_players_synced}</li>
                  </ul>
                  
                  {syncStats.unmapped_bladers?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <h4 className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Unmapped Players (No Profile)</h4>
                      <div className="flex flex-wrap gap-2">
                        {syncStats.unmapped_bladers.map((name, i) => (
                          <span key={i} className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-400">{name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PLAYER REGISTRATION FORM */}
          {activeTab === 'player' && (
            <form onSubmit={handlePlayerSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Display Name</label>
                <input 
                  type="text" required
                  value={playerForm.username}
                  onChange={(e) => setPlayerForm({...playerForm, username: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Challonge Handle</label>
                <input 
                  type="text" required
                  value={playerForm.challonge_username}
                  onChange={(e) => setPlayerForm({...playerForm, challonge_username: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Team Affiliation (Optional)</label>
                <select 
                  value={playerForm.team_id}
                  onChange={(e) => setPlayerForm({...playerForm, team_id: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                >
                  <option value="">-- Free Agent --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all mt-4">
                Initialize Profile
              </button>
            </form>
          )}

          {/* TEAM CREATION FORM */}
          {activeTab === 'team' && (
            <form onSubmit={handleTeamSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Team Name</label>
                <input 
                  type="text" required
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Logo URL (Optional)</label>
                <input 
                  type="url"
                  value={teamForm.logo_url}
                  onChange={(e) => setTeamForm({...teamForm, logo_url: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest py-4 rounded transition-all mt-4">
                Register Squad
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}