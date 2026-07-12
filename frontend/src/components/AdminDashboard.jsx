import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sync');
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [activeLeagueId, setActiveLeagueId] = useState(localStorage.getItem('active_league_id') || null);
  const [syncStats, setSyncStats] = useState(null);

  const [leagueForm, setLeagueForm] = useState({ name: '', description: '' });
  const [playerForm, setPlayerForm] = useState({ username: '', challonge_username: '', team_id: '' });
  const [teamForm, setTeamForm] = useState({ name: '', logo_url: '' });
  const [syncForm, setSyncForm] = useState({ tournament_id: '' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const displayMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 8000);
  };

  // 1. Initial Load & Route Protection
  useEffect(() => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (!token || !isAdmin) {
      navigate('/login');
      return;
    }

    fetch('http://127.0.0.1:8000/api/leagues/me', { headers: getAuthHeaders() })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load leagues.");
        return res.json();
      })
      .then(data => setLeagues(data))
      .catch(err => {
        console.error(err);
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [navigate]);

  // 2. NEW: Dynamically fetch teams ONLY for the active league
  useEffect(() => {
    if (activeLeagueId) {
      fetch(`http://127.0.0.1:8000/api/teams?league_id=${activeLeagueId}`)
        .then(res => res.json())
        .then(data => setTeams(data))
        .catch(err => console.error("Could not load teams", err));
    }
  }, [activeLeagueId]);

  const handleLeagueSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Initializing Workspace...', type: 'loading' });

    try {
      const response = await fetch('http://127.0.0.1:8000/api/leagues', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(leagueForm)
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to create league");
      
      displayMessage('League initialized!', 'success');
      setLeagues([...leagues, data]);
      setLeagueForm({ name: '', description: '' });
      setActiveLeagueId(data.id.toString());
      localStorage.setItem('active_league_id', data.id.toString());
    } catch (error) { displayMessage(error.message, 'error'); }
  };

  // 3. NEW: Inject Active League ID into the Sync Payload
  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Syncing with Challonge API...', type: 'loading' });
    
    const payload = { ...syncForm, league_id: parseInt(activeLeagueId) };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/sync/challonge', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to sync tournament");
      displayMessage('Bracket synchronized successfully!', 'success');
      setSyncStats(data);
      setSyncForm({ tournament_id: '' });
    } catch (error) { displayMessage(error.message, 'error'); }
  };

  // 4. NEW: Inject Active League ID into the Player Payload
  const handlePlayerSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Registering...', type: 'loading' });
    
    const payload = { 
      ...playerForm, 
      team_id: playerForm.team_id ? parseInt(playerForm.team_id) : null,
      league_id: parseInt(activeLeagueId)
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
    } catch (error) { displayMessage(error.message, 'error'); }
  };

  // 5. NEW: Inject Active League ID into the Team Payload
  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Creating Team...', type: 'loading' });
    
    const payload = { ...teamForm, league_id: parseInt(activeLeagueId) };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/teams', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to create team");
      displayMessage('Team created successfully!', 'success');
      setTeamForm({ name: '', logo_url: '' });
      setTeams([...teams, data.team]); 
    } catch (error) { displayMessage(error.message, 'error'); }
  };

  if (!activeLeagueId) {
    return (
      <div className="min-h-[90vh] bg-gray-950 text-gray-100 p-6 flex items-center justify-center border-t border-red-900/30">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500">
              Select Workspace
            </h1>
            <p className="text-sm text-gray-500 tracking-widest uppercase mt-2">Initialize your circuit to continue</p>
          </div>

          {leagues.length > 0 && (
            <div className="bg-black p-6 rounded-xl border border-gray-800 shadow-xl">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Your Active Circuits</h2>
              <div className="space-y-3">
                {leagues.map(league => (
                  <button 
                    key={league.id}
                    onClick={() => {
                      setActiveLeagueId(league.id.toString());
                      localStorage.setItem('active_league_id', league.id.toString());
                    }}
                    className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-blue-500 p-4 rounded transition-all text-blue-400 font-bold tracking-wide uppercase"
                  >
                    {league.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-800"></div>
            <span className="text-xs text-gray-600 font-bold uppercase tracking-widest">OR</span>
            <div className="flex-1 border-t border-gray-800"></div>
          </div>

          <div className="bg-black p-6 rounded-xl border border-gray-800 shadow-xl shadow-red-900/10">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Establish New Circuit</h2>
            <form onSubmit={handleLeagueSubmit} className="space-y-4">
              <div>
                <input 
                  type="text" required placeholder="Circuit Name (e.g. Charlotte Throwdown)"
                  value={leagueForm.name}
                  onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <textarea 
                  placeholder="Optional Description..."
                  value={leagueForm.description}
                  onChange={(e) => setLeagueForm({...leagueForm, description: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-gray-100 focus:outline-none focus:border-red-500 h-24 resize-none"
                />
              </div>
              <button type="submit" className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest py-3 rounded transition-all shadow-lg shadow-red-900/20">
                Launch
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
  
  const currentLeague = leagues.find(l => l.id.toString() === activeLeagueId);

  return (
    <div className="min-h-[90vh] bg-gray-950 text-gray-100 p-6 font-sans flex flex-col items-center border-t border-red-900/30 pt-10">
      <div className="max-w-xl w-full flex justify-between items-center bg-gray-900/80 border border-gray-800 rounded-t-xl p-3 px-5 border-b-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs text-gray-400 tracking-widest uppercase font-bold">
            Workspace: <span className="text-white">{currentLeague?.name || 'Loading...'}</span>
          </span>
        </div>
        <button 
          onClick={() => { setActiveLeagueId(null); localStorage.removeItem('active_league_id'); }}
          className="text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-colors"
        >
          Change Circuit
        </button>
      </div>

      <div className="max-w-xl w-full bg-black rounded-b-xl rounded-tr-xl border border-gray-800 shadow-2xl shadow-blue-900/10 overflow-hidden">
        <div className="p-6 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500">
              Command Center
            </h1>
            <p className="text-sm text-gray-500 tracking-widest uppercase mt-1">
              Data & Roster Management
            </p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('is_admin');
              localStorage.removeItem('active_league_id');
              navigate('/login');
            }}
            className="text-xs font-bold uppercase tracking-widest text-red-500 hover:text-red-400 border border-red-900/50 hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors"
          >
            Log Out
          </button>
        </div>

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

        {message.text && (
          <div className={`p-4 mx-6 mt-6 rounded text-sm font-bold tracking-wide border-l-4 ${
            message.type === 'error' ? 'bg-red-950/50 text-red-400 border-red-600' : 
            message.type === 'success' ? 'bg-blue-950/50 text-blue-400 border-blue-500' : 
            'bg-gray-800 text-gray-400 border-gray-600'
          }`}>
            {message.text}
          </div>
        )}

        <div className="p-6">
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