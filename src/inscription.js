import React, { useState } from 'react';
import './inscription.css';
import { Link } from 'react-router-dom';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const POSTES = [
  { value: 'admin', label: 'Administrateur', initial: 'A' },
  { value: 'jobSeeker', label: "Chercheur d'emploi", initial: 'C' },
  { value: 'employer', label: 'Artisan / Employeur', initial: 'E' },
];

function Inscription() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    poste: 'jobSeeker',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Erreur: Les mots de passe ne correspondent pas.");
      return;
    }
    // Ajoute l'initiale du poste au début du mot de passe c C
    const posteObj = POSTES.find(p => p.value === formData.poste);
    const finalPassword = posteObj.initial + formData.password;
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        finalPassword
      );
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: formData.name,
        phone: formData.phone,
        poste: formData.poste,
        email: formData.email
      });
      navigate('/', { state: { registered: true } });
    } catch (error) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="inscription-container">
      <div className="inscription-box">
        <Link to="/" className="back-link">
          &larr; Retour à la connexion
        </Link>
        <div className="header-logo">
          <h1 className="logo-text">JKL Global Service</h1>
        </div>
        <p className="platform-tagline">
          Créer votre compte professionnel
        </p>
        <form onSubmit={handleRegister} className="inscription-form">
          <h2 className="form-title">Inscription</h2>
          <div className="input-group">
            <label htmlFor="name">Nom complet</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Jean Dupont"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="phone">Téléphone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+33 6 12 34 56 78"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="votre@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="poste">Type de compte</label>
            <select
              id="poste"
              name="poste"
              value={formData.poste}
              onChange={handleChange}
              required
            >
              {POSTES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="**********"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmer mot de passe</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="**********"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="security-alert">
            <span className="alert-icon">⚠️</span>
            Vos données sont <b>sécurisées</b>. En vous inscrivant, vous acceptez nos{' '}
            <a href="/conditions">conditions d'utilisation</a> et notre{' '}
            <a href="/politique">politique de confidentialité</a>.
          </div>
          <button type="submit" className="connect-button">
            Créer mon compte
          </button>
        </form>
      </div>
    </div>
  );
}

export default Inscription;