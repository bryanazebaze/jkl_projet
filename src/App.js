import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './login';
import Inscription from './inscription';
import Chercheur_emplois from './chercheur_emplois/chercheur_emplois';
import Artisan from './artisan/artisan';
import Admin from './admin/admin';
import MesCandidatures from './chercheur_emplois/mes_candidatures';
import Chat from './chercheur_emplois/chat';
import ArtisanCandidatures from './artisan/ArtisanCandidatures';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Inscription />} />
        <Route path="/chercheur_emplois" element={<Chercheur_emplois />} />
        <Route path="/artisan" element={<Artisan />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mes-candidatures" element={<MesCandidatures />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/artisan-candidatures" element={<ArtisanCandidatures />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;