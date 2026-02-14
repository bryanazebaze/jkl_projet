import React, { useEffect, useState } from 'react';
import './chercheur_emplois.css';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, addDoc, serverTimestamp, query, where, updateDoc, deleteDoc,onSnapshot } from 'firebase/firestore';
import logoIm from '../assets/logo.jpeg';

const Chercheur_emplois = () => {
  const [userName, setUserName] = useState('');
  const [ads, setAds] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [showJobInfo, setShowJobInfo] = useState(false);
  const [employerInfo, setEmployerInfo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [myCandidatures, setMyCandidatures] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  


  


  // Filtres avancés
  const [searchJob, setSearchJob] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    // Si tu veux aussi supprimer dans Firestore, ajoute ici la logique Firestore
  };

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = '/';
  };


  // À ajouter pour corriger l'erreur "fetchUserData n'est pas défini"
  const fetchUserData = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserName(docSnap.data().name);
    }
  };

  // Ajoute cette fonction dans ton composant Chercheur_emplois
  const addNotification = async (message) => {
    const user = auth.currentUser;
    if (!user) return;
    // Ajout local
    setNotifications(prev => [
      ...prev,
      {
        message,
        id: Date.now(),
        date: new Date().toISOString()
      }
    ]);
    // Ajout Firestore
    await addDoc(collection(db, "notifications"), {
      userId: user.uid,
      message,
      date: serverTimestamp()
    });
  };

  // 1. Déclare la fonction fetchAds ici (en dehors du useEffect)
  const fetchAds = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ads"));
      const adsList = [];
      querySnapshot.forEach((doc) => {
        adsList.push({ id: doc.id, ...doc.data() });
      });
      setAds(adsList);
    } catch (error) {
      console.error("Erreur fetchAds:", error);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user.uid);
        // Surveillance en temps réel du nombre de candidatures
        const q = query(collection(db, 'candidatures'), where('seekerId', '==', user.uid));
        onSnapshot(q, (snapshot) => {
          setMyCandidatures(snapshot.docs.map(doc => doc.data()));
        });
      }
    });

    fetchAds();
    return () => unsub(); // Correction faite ici (unsub au lieu de unsubscribe)
  }, []);
  


  useEffect(() => {
  const user = auth.currentUser;
  if (!user) return;

  

  // On écoute les messages envoyés à l'utilisateur actuel (toId == user.uid) et non lus (seen == false)
  const q = query(
    collection(db, "messages"),
    where("toId", "==", user.uid),
    where("seen", "==", false)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // On récupère tous les adId des messages non lus
    const unreadAds = snapshot.docs.map(doc => doc.data().adId);
    
    // On utilise un "Set" pour ne compter qu'une seule fois chaque candidature/annonce
    const uniqueAdsWithMessages = new Set(unreadAds);
    
    setUnreadMessagesCount(uniqueAdsWithMessages.size);
  });

  return () => unsubscribe();
}, [auth.currentUser]);



  // --- FILTRAGE AVANCÉ ---
  const filteredAds = ads.filter(ad => {
    // Filtre par poste
    const matchJob = searchJob === '' || (ad.jobType || '').toLowerCase().includes(searchJob.toLowerCase());
    // Filtre par budget
    const amount = Number(ad.amount || 0);
    const matchBudgetMin = !budgetMin || amount >= Number(budgetMin);
    const matchBudgetMax = !budgetMax || amount <= Number(budgetMax);
    // Filtre par localisation
    const matchLocation = searchLocation === '' || (ad.location || '').toLowerCase().includes(searchLocation.toLowerCase());
    return matchJob && matchBudgetMin && matchBudgetMax && matchLocation;
  });


  const handleFinalApply = async (ad, isFree) => {
  // 1. Récupère les infos de l'artisan
  const userDoc = await getDoc(doc(db, "users", ad.artisanId));
  let artisanData = {};
  if (userDoc.exists()) {
    artisanData = userDoc.data();
    setEmployerInfo(artisanData);
    setShowJobInfo(true);
  }

  const user = auth.currentUser;
  if (user) {
    // 2. Enregistre la candidature avec le prix (0 ou 50)
    await addDoc(collection(db, "candidatures"), {
      adId: ad.id,
      jobType: ad.jobType,
      description: ad.description,
      amount: ad.amount,
      remunerationMode: ad.remunerationMode,
      duration: ad.duration,
      location: ad.location,
      artisanId: ad.artisanId,
      artisanName: artisanData.name || "Inconnu",
      artisanEmail: artisanData.email || "Non renseigné",
      artisanContact: artisanData.contact || "Non renseigné",
      seekerId: user.uid,
      seekerName: userName,
      createdAt: serverTimestamp(),
      paid: true,
      price: isFree ? 0 : 50 // Modification ici
    });
    await addNotification(`Candidature envoyée pour : ${ad.jobType}`);
  }

  // 3. Met à jour les places restantes (ton code actuel)
  /*const adRef = doc(db, "ads", ad.id);
  const adSnap = await getDoc(adRef);
  if (adSnap.exists()) {
    const currentNum = adSnap.data().numPeople || 0;
    if (currentNum > 1) {
      await updateDoc(adRef, { numPeople: currentNum - 1 });
      fetchAds();
    } else {
      await deleteDoc(adRef);
      fetchAds();
    }
  }*/
};

  return (
    <div className="seeker-page">
      {/* --- HEADER --- */}
      <header className="seeker-header">
        <div className="header-left">
  <div className="logo-container">
    <div className="logo-badge">
      <img src={logoIm} alt="JKL Logo" className="logo-img" />
      <span>JKL Global Service</span>
    </div>
    <span className="page-title">Espace Chercheur d'emploi</span>
  </div>
</div>
        <div className="header-right">
          <a href="/mes-candidatures" className="icon-btn-circle" title="Mes candidatures" style={{ position: 'relative' }}>
  <i className="fas fa-briefcase"></i>
  {/* Affichage du badge si le compteur est supérieur à 0 */}
  {unreadMessagesCount > 0 && (
    <span className="notification-badge-dot" style={{ background: '#ef4444' }}>
      {unreadMessagesCount}
    </span>
  )}
</a>
          <div className="notif-wrapper">
            <button 
              className="icon-btn-circle"
              onClick={() => setShowNotificationsDropdown(v => !v)}
            >
              <i className="fas fa-bell"></i>
              {notifications.length > 0 && (
                <span className="notification-badge-dot">{notifications.length}</span>
              )}
            </button>
            {showNotificationsDropdown && (
              <div className="notifications-dropdown">
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <h4>Notifications</h4>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "1.3em",
                      cursor: "pointer",
                      color: "#2563eb"
                    }}
                    onClick={() => setShowNotificationsDropdown(false)}
                    title="Fermer"
                  >
                    &times;
                  </button>
                </div>
                <ul>
                  {notifications.length === 0 ? (
                    <li>Aucune notification</li>
                  ) : (
                    notifications.map((notif, idx) => (
                      <li key={notif.id} style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                        <div>
                          <span className="notif-message">{notif.message}</span>
                          <span className="notif-date">
                            {notif.date
                              ? new Date(notif.date).toLocaleString('fr-FR')
                              : ''}
                          </span>
                        </div>
                        <button
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "1.2em",
                            marginLeft: "8px",
                            cursor: "pointer"
                          }}
                          title="Supprimer"
                          onClick={() => handleDeleteNotification(notif.id)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className="user-section">
            <div className="user-profile-info">
              <span className="user-name">{userName}</span>
              <span className="user-role">Chercheur</span>
            </div>
            <div className="user-actions-mobile">
              <div className="user-avatar-mobile" title={userName}>
                {userName ? userName.charAt(0).toUpperCase() : 'C'}
              </div>
              <button
                className="logout-btn-simple"
                title="Déconnexion"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="seeker-container">
        {/* HERO BANNER */}
        <section className="hero-banner">
          <h1>Trouvez votre prochaine opportunité</h1>
          <p>Découvrez les offres d'emploi publiées par des artisans et entreprises de confiance.</p>
        </section>

        {/* SEARCH BAR WIDGET */}
        {/* --- NOUVEAU SEARCH WIDGET PROFESSIONNEL --- */}
<div className="search-container-pro">
  <div className="search-main-row">
    {/* Groupe Métier */}
    <div className="filter-group">
      <div className="input-with-icon">
        <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input 
          type="text" 
          placeholder="Quel métier ?" 
          className="filter-input"
          value={searchJob}
          onChange={e => setSearchJob(e.target.value)}
        />
      </div>
    </div>

    <div className="v-separator"></div>

    {/* Groupe Localisation */}
    <div className="filter-group">
      <div className="input-with-icon">
        <svg className="field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <input
          type="text"
          placeholder="Localisation"
          className="filter-input"
          value={searchLocation}
          onChange={e => setSearchLocation(e.target.value)}
        />
      </div>
    </div>

    <button className="btn-search-trigger">
      Rechercher
    </button>
  </div>

  <div className="search-secondary-row">
    <span className="filter-label">Budget (Fcfa) :</span>
    <div className="budget-inputs">
      <input
        type="number"
        placeholder="Min"
        className="budget-input"
        value={budgetMin}
        onChange={e => setBudgetMin(e.target.value)}
      />
      <span className="dash">-</span>
      <input
        type="number"
        placeholder="Max"
        className="budget-input"
        value={budgetMax}
        onChange={e => setBudgetMax(e.target.value)}
      />
    </div>
    
    <button className="btn-clear-filters" onClick={() => {setSearchJob(''); setSearchLocation(''); setBudgetMin(''); setBudgetMax('');}}>
      Effacer
    </button>
  </div>
</div>

        {/* OFFERS SECTION */}
        <section className="offers-section">
          <div className="offers-header">
            <h2>Offres disponibles</h2>
            <span className="offers-count">{filteredAds.length} offre(s)</span>
          </div>
          <div className="ads-list">
            {filteredAds.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-icon-circle">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <p>Aucune offre ne correspond à vos critères</p>
              </div>
            ) : (
              filteredAds.map(ad => (
                <div className="ad-card" key={ad.id}>
                  <div className="ad-card-header">
                    <h3>{ad.jobType}</h3>
                    <span className="ad-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>
                      Publiée
                    </span>
                  </div>
                  <div className="ad-card-info">
                    <span className="ad-people">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle></svg>
                      {ad.numPeople} personne(s)
                    </span>
                    <span className="ad-budget">
                      Budget: {Number(ad.amount).toLocaleString()} Fcfa
                    </span>
                  </div>
                  <div className="ad-description">
                    {ad.description}
                  </div>
                  <div className="ad-card-footer">
                    <span className="ad-date">
                      Publiée le {ad.createdAt && ad.createdAt.toDate ? ad.createdAt.toDate().toLocaleDateString('fr-FR') : ''}
                    </span>
                    <button
  className="btn-postuler"
  onClick={() => {
    setSelectedAd(ad);
    // LOGIQUE : Si < 3 candidatures, on affiche direct les infos, sinon modal de paiement
    if (myCandidatures.length < 3) {
      const reste = 3 - myCandidatures.length;
      if (window.confirm(`Il vous reste ${reste} candidature(s) gratuite(s). Voulez-vous postuler gratuitement ?`)) {
        // On simule un submit direct sans paiement
        handleFinalApply(ad, true); 
      }
    } else {
      setShowPaymentModal(true);
    }
  }}
>
  Postuler
</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* MODAL DE PAIEMENT */}
       {/* MODAL DE PAIEMENT MIS À JOUR */}
        {showPaymentModal && selectedAd && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Paiement pour postuler</h2>
              <p>
                <b style={{color: "#1d4ed8", fontSize: "1.2em"}}>Montant à payer : 50 Fcfa</b>
                <br />
                <span style={{ color: "#6b7280", fontSize: "0.9em" }}>
                  Vos 3 candidatures gratuites sont épuisées.
                </span>
              </p>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setShowPaymentModal(false);
                  // On appelle la fonction que tu as déjà créée avec isFree = false
                  handleFinalApply(selectedAd, false);
                }}
              >
                <label>Mode de paiement :
                  <select required><option value="mtn">MTN / Orange Money</option></select>
                </label>
                <label>Numéro de téléphone :
                  <input type="tel" placeholder="Ex: 0700000000" required />
                </label>
                <button type="submit">Payer 50 FCFA et postuler</button>
                <button type="button" onClick={() => setShowPaymentModal(false)}>Annuler</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL INFOS APRÈS PAIEMENT */}
        {showJobInfo && employerInfo && (
          <div className="modal-overlay">
            <div className="modal-content job-info-modal">
              <h2 style={{ color: "#059669", textAlign: "center", marginBottom: 18 }}>Paiement réussi !</h2>
              <div className="job-info-box">
                <h3>{selectedAd.jobType}</h3>
                <p><b>Description :</b> {selectedAd.description}</p>
                <p><b>Date de publication :</b> {selectedAd.createdAt?.toDate ? selectedAd.createdAt.toDate().toLocaleDateString('fr-FR') : ''}</p>
                <p><b>Budget :</b> {selectedAd.amount} Fcfa</p>
                <p><b>Mode de rémunération :</b> {selectedAd.remunerationMode}</p>
                <p><b>Durée :</b> {selectedAd.duration}</p>
                <p><b>Localisation :</b> {selectedAd.location}</p>
              </div>
              <div className="employer-details" style={{ marginTop: 12 }}>
                <h4>Informations sur l’employeur</h4>
                <p><b>Nom :</b> {employerInfo?.name}</p>
                <p><b>Email :</b> {employerInfo?.email}</p>
                <p><b>Contact :</b> {employerInfo?.contact}</p>
              </div>
              <button className="btn-close" onClick={() => {
                setShowJobInfo(false);
                setEmployerInfo(null);
                setSelectedAd(null);
              }}>Fermer</button>
            </div>
          </div>
        )}

        {/* FLOATING HELP BUTTON */}
        <button className="help-fab">?</button>
      </main>
    </div>
  );
};

export default Chercheur_emplois;