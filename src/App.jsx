import { BrowserRouter, Routes, Route } from "react-router-dom";

import WelcomeScreen from "./screens/WelcomeScreen";
import ChatOnboardingScreen from "./screens/ChatOnboardingScreen";
import DocumentUploadScreen from "./screens/DocumentUploadScreen";
import DashboardScreen from "./screens/DashboardScreen";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Route for the homepage */}
        <Route path="/" element={<WelcomeScreen />} />

        {/* 2. Add the route for your dynamic chat screen */}
        <Route path="/onboarding/chat" element={<ChatOnboardingScreen />} />

        {/* Placeholder for the next screen */}
        <Route path="/onboarding/upload" element={<DocumentUploadScreen />} />

        <Route path="/dashboard" element={<DashboardScreen />} />
        
        <Route path="/document-upload" element={<DocumentUploadScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
