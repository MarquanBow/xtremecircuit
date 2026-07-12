import { useState, useEffect } from 'react';

export default function Leaderboard() {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/leaderboard')
      .then(res => res.json())
      .then(data => {
        setStandings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Could not load leaderboard", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-500 font-bold tracking-widest uppercase">
        Initializing Standings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans border-t border-red-900/30">
      <div className="max-w-3xl mx-auto mt-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-blue-500 mb-2 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            Xtreme Circuit
          </h1>
          <h2 className="text-xl text-gray-400 font-bold tracking-widest uppercase">Official Grand Prix Standings</h2>
        </div>

        {/* The Board */}
        <div className="bg-black rounded-xl border border-gray-800 shadow-2xl shadow-blue-900/10 overflow-hidden">
          
          {/* Table Headers */}
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 bg-gray-900/50 text-xs font-black tracking-widest uppercase text-gray-500">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-5">Blader</div>
            <div className="col-span-3">Team</div>
            <div className="col-span-2 text-right pr-4">GP Points</div>
          </div>

          {/* Player Rows */}
          <div className="divide-y divide-gray-800/50">
            {standings.length === 0 ? (
              <div className="p-8 text-center text-gray-600 font-bold uppercase tracking-widest">
                No tournament data found. Sync a bracket to begin.
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