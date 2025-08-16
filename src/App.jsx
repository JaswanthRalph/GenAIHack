import { BrowserRouter, Routes, Route } from "react-router-dom";

import WelcomeScreen from "./screens/WelcomeScreen";
import ChatOnboardingScreen from "./screens/ChatOnboardingScreen";
import DocumentUploadScreen from "./screens/DocumentUploadScreen";
import DashboardScreen from "./screens/DashboardScreen";
import PrivateRoute from './components/PrivateRoute';
import { auth } from './firebase';
import { useEffect, useState } from 'react';


export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WelcomeScreen />} />

        {/* Onboarding Flow */}
        <Route path="/onboarding/chat" element={<ChatOnboardingScreen />} />
        <Route path="/onboarding/upload" element={<DocumentUploadScreen />} />

        {/* Main Application */}
        <Route path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardScreen />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
