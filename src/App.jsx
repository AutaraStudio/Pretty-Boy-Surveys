import { Routes, Route } from 'react-router-dom'
import NpsSurvey from './pages/NpsSurvey/NpsSurvey'
import SubscriptionSurvey from './pages/SubscriptionSurvey/SubscriptionSurvey'
import './App.css'



function App() {
  return (
    <Routes>
      <Route path="/" element={<div style={{ background: '#fff', minHeight: '100vh' }} />} />
      <Route path="/nps" element={<NpsSurvey />} />
      <Route path="/subscription" element={<SubscriptionSurvey />} />
      {/* Unknown routes get blank white page */}
      <Route path="*" element={<div style={{ background: '#fff', minHeight: '100vh' }} />} />
    </Routes>
  )
}

export default App