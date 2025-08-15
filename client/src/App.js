import React, { useState } from 'react';
import './App.css';
import BottomNav from './components/BottomNav';
import DollsPage from './pages/DollsPage';
import MakeupPage from './pages/MakeupPage';
import WardrobePage from './pages/WardrobePage';
import MyPage from './pages/MyPage';

function App() {
  const [activeTab, setActiveTab] = useState('dolls');

  const renderCurrentPage = () => {
    switch(activeTab) {
      case 'dolls':
        return <DollsPage />;
      case 'makeup':
        return <MakeupPage />;
      case 'wardrobe':
        return <WardrobePage />;
      case 'profile':
        return <MyPage onNavigate={setActiveTab} />;
      default:
        return <DollsPage />;
    }
  };

  return (
    <div className="App">
      <main className="main-content">
        {renderCurrentPage()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default App;