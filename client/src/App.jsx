import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AutoSyncProvider } from './context/AutoSyncContext';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import Signup from './pages/Signup';
import PanelDashboard from './pages/PanelDashboard';
import InsightDashboard from './pages/InsightDashboard';
import RespondentDashboard from './pages/RespondentDashboard';
import Panelists from './pages/Panelists';
import InsightRespondents from './pages/InsightRespondents';
import Verify from './pages/Verify';
import VerificationSuccess from './pages/VerificationSuccess';
import './App.css';

function App() {
  return (
    <AutoSyncProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard/panel" element={<PanelDashboard />} />
          <Route path="/dashboard/panel/panelists" element={<Panelists />} />
          <Route path="/dashboard/insight" element={<InsightDashboard />} />
          <Route path="/dashboard/insight/respondents" element={<InsightRespondents />} />
          <Route path="/dashboard/respondent" element={<RespondentDashboard />} />
          <Route path="/verify/:token" element={<Verify />} />
          <Route path="/verification-success" element={<VerificationSuccess />} />
        </Routes>
      </Router>
    </AutoSyncProvider>
  );
}

export default App;
