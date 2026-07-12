import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import Leaderboard from './components/Leaderboard';
import Login from './components/Login';
import Signup from './components/Signup';

function App() {
  return (
    <Router>
      <div className="bg-gray-950 min-h-screen border-t-[4px] border-black">
        {/* Universal Top Navigation */}
        <nav className="bg-black border-b border-gray-900 p-4 flex justify-center gap-6 shadow-md shadow-gray-900/20">
          <Link to="/" className="font-bold tracking-widest uppercase text-xs px-4 py-2 rounded transition-colors text-gray-500 hover:text-gray-300 hover:bg-gray-900">
            Home Standings
          </Link>
          <Link to="/admin" className="font-bold tracking-widest uppercase text-xs px-4 py-2 rounded transition-colors text-gray-500 hover:text-gray-300 hover:bg-gray-900">
            Command Center
          </Link>
          <div className="border-l border-gray-800 mx-2"></div> {/* Divider */}
          <Link to="/login" className="font-bold tracking-widest uppercase text-xs px-4 py-2 rounded transition-colors bg-blue-500/10 text-blue-500 border border-blue-500/30 hover:bg-blue-500/20">
            Login
          </Link>
          <Link to="/signup" className="font-bold tracking-widest uppercase text-xs px-4 py-2 rounded transition-colors bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20">
            Sign Up
          </Link>
        </nav>

        {/* Dynamic Page Content */}
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;