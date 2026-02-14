import React, { useState } from 'react';
import './login.css';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';


const POSTES = [
  { value: 'admin', label: 'Administrateur', initial: 'A', route: '/admin' },
  { value: 'jobSeeker', label: "Chercheur d'emploi", initial: 'C', route: '/chercheur_emplois' },
  { value: 'employer', label: 'Artisan / Employeur', initial: 'E', route: '/artisan' },
];

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [poste, setPoste] = useState('jobSeeker');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    // Ajoute l'initiale du poste choisi devant le mot de passe
    const posteObj = POSTES.find(p => p.value === poste);
    if (!posteObj) {
      alert("Veuillez choisir un type de compte.");
      return;
    }
    const finalPassword = posteObj.initial + password;
    try {
      await signInWithEmailAndPassword(auth, email, finalPassword);
      navigate(posteObj.route);
    } catch (error) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="header-logo">
          <h1 className="logo-text">JKL Global Service</h1>
        </div>
        <p className="platform-tagline">
          Plateforme de mise en relation professionnelle
        </p>
        <form onSubmit={handleLogin} className="login-form">
          <h2 className="form-title">Connexion</h2>
          <div className="account-type-selection">
            <div className="account-type-row">
              {POSTES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  className={`account-type-btn${poste === p.value ? ' selected' : ''}`}
                  onClick={() => setPoste(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              placeholder="**********"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="connect-button">
            Se connecter
          </button>
        </form>
        <p className="signup-link-container">
          Pas encore de compte ?{' '}
          <a href="/register" className="signup-link">
            S'inscrire
          </a>
        </p>
      </div>
    </div>
  );
}

export default Login;