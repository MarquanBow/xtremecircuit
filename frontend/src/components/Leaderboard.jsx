import { useState, useEffect } from 'react';

export default function Leaderboard() {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch all available circuits on initial load
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/leagues')
      .then(res => res.json())
      .then(data => {
        setLeagues(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Could not load leagues", err);
        setLoading(false);
      });
  }, []);

  // 2. Fetch specific standings when a circuit is clicked
  const loadLeaderboard = (league) => {
    setSelectedLeague(league);
    setLoading(true);
    
    fetch(`http://127.0.0.1:8000/api/leaderboard?league_id=${league.id}`)
      .then(res => res.json())
      .then(data => {
        setStandings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Could not load leaderboard", err);
        setLoading(false);
      });
  };

  if (loading && !selectedLeague) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-500 font-bold tracking-widest uppercase">
        Establishing Connection...
      </div>
    );
  }

  // ---------------------------------------------------------
  // VIEW: CIRCUIT DIRECTORY (No league selected yet)
  // ---------------------------------------------------------
  if (!selectedLeague) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans border-t border-red-900/30">
        <div className="max-w-4xl mx-auto mt-10">
          
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-blue-500 mb-2 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
              Global Circuit Network
            </h1>
            <h2 className="text-xl text-gray-400 font-bold tracking-widest uppercase">Select an active league</h2>
          </div>

          {leagues.length === 0 ? (
            <div className="bg-black p-8 text-center rounded border border-gray-800 text-gray-600 font-bold uppercase tracking-widest">
              No active circuits found. Organizers must initialize a workspace.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {leagues.map(league => (
                <div 
                  key={league.id} 
                  onClick={() => loadLeaderboard(league)}
                  className="bg-black border border-gray-800 hover:border-blue-500 p-6 rounded-xl cursor-pointer transition-all hover:-translate-y-1 shadow-lg hover:shadow-blue-900/20 group"
                >
                  <h3 className="text-2xl font-black uppercase tracking-wider text-gray-200 group-hover:text-blue-400 transition-colors">
                    {league.name}
                  </h3>
                  {league.description && (
                    <p className="text-sm text-gray-500 mt-2 font-medium">{league.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 group-hover:text-red-400">
                    <span>View Standings</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // VIEW: THE LEADERBOARD (Viewing a specific league)
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans border-t border-red-900/30">
      <div className="max-w-3xl mx-auto mt-6">
        
        {/* Navigation Strip */}
        <button 
          onClick={() => { setSelectedLeague(null); setStandings([]); }}
          className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          <span>←</span> Back to Directory
        </button>

        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-blue-500 mb-2 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            {selectedLeague.name}
          </h1>
          <h2 className="text-xl text-gray-400 font-bold tracking-widest uppercase">Official Grand Prix Standings</h2>
        </div>

        {/* The Board */}
        <div className="bg-black rounded-xl border border-gray-800 shadow-2xl shadow-blue-900/10 overflow-hidden">
          
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 bg-gray-900/50 text-xs font-black tracking-widest uppercase text-gray-500">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-5">Blader</div>
            <div className="col-span-3">Team</div>
            <div className="col-span-2 text-right pr-4">GP Points</div>
          </div>

          <div className="divide-y divide-gray-800/50">
            {loading ? (
              <div className="p-12 text-center text-blue-500 font-bold uppercase tracking-widest animate-pulse">
                Calculating Points...
              </div>
            ) : standings.length === 0 ? (
              <div className="p-8 text-center text-gray-600 font-bold uppercase tracking-widest">
                No active players have scored points in this circuit yet.
              </div>
            ) : (
              standings.map((player) => {
                let rankStyle = "text-gray-400";
                let rowBg = "hover:bg-gray-900 transition-colors";
                
                if (player.rank === 1) {
                  rankStyle = "text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]";
                  rowBg = "bg-yellow-950/20 border-l-2 border-yellow-500 hover:bg-yellow-900/30";
                } else if (player.rank === 2) {
                  rankStyle = "text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.6)]";
                  rowBg = "bg-gray-800/40 border-l-2 border-gray-400 hover:bg-gray-800/60";
                } else if (player.rank === 3) {
                  rankStyle = "text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.6)]";
                  rowBg = "bg-amber-950/20 border-l-2 border-amber-600 hover:bg-amber-900/30";
                }

                return (
                  <div key={player.username} className={`grid grid-cols-12 gap-4 p-4 items-center ${rowBg}`}>
                    <div className={`col-span-2 text-center text-2xl font-black italic ${rankStyle}`}>
                      {player.rank}
                    </div>
                    <div className="col-span-5">
                      <div className="font-bold text-lg tracking-wide">{player.username}</div>
                    </div>
                    <div className="col-span-3 text-xs font-bold uppercase tracking-widest text-gray-500">
                      {player.team}
                    </div>
                    <div className="col-span-2 text-right pr-4 font-black text-xl text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">
                      {player.points}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}