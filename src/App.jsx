import { Routes, Route, Navigate } from 'react-router-dom'
import NpsSurvey from './pages/NpsSurvey/NpsSurvey'
import SubscriptionSurvey from './pages/SubscriptionSurvey/SubscriptionSurvey'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/nps" element={<NpsSurvey />} />
      <Route path="/subscription" element={<SubscriptionSurvey />} />
      {/* Default redirect — change as needed */}
      <Route path="*" element={<Navigate to="/nps" replace />} />
    </Routes>
  )
}

export default App
