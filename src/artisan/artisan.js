import React, { useEffect, useState } from 'react';
import './artisan.css';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  onSnapshot,
  orderBy, // <-- AJOUT : Pour trier les notifications
  deleteDoc
} from 'firebase/firestore'; 
import { useNavigate } from 'react-router-dom';
import logoIm from '../assets/logo.jpeg' // <-- AJOUTE CETTE LIGNE

// ⚠️ COÛT D'UNE ANNONCE HARMONISÉ
// Remplace l'ancienne constante AD_COST par celles-ci
// Remplace tes lignes 22-25 par ceci :
const AD_COST_NORMAL = 1; // Coût habituel (1 crédit)
const AD_COST_PROMO = 0;   // Coût pour la toute première fois (0 crédit)
// --- COMPOSANT DÉDIÉ AU SOLDE ---
const CreditDisplay = ({ credits }) => {
  return (
    <div className="credit-badge">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e42" strokeWidth="2"><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="#f59e42">C</text></svg>
      <span>{credits} crédits</span> 
    </div>
  );
};
// ------------------------------------------

const Artisan = () => {
  const navigate = useNavigate();
  // ⚠️ ÉTAT DE CHARGEMENT RÉINTRODUIT
  const [loading, setLoading] = useState(true); 
  
  // Réintroduction des états pour la gestion des crédits/achats
  const [selectedPack, setSelectedPack] = useState(3);
  const [showBuyCreditModal, setShowBuyCreditModal] = useState(false);
  const [soldeCredits, setSoldeCredits] = useState(0); 
  const [showPaymentForm, setShowPaymentForm] = useState(false); 
  const [paymentMethod, setPaymentMethod] = useState('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [userName, setUserName] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // --- AJOUT : ÉTATS POUR LES NOTIFICATIONS ---
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  // --------------------------------------------
const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const [formData, setFormData] = useState({
    jobType: '',
    numPeople: '',
    amount: '',
    remunerationMode: '',
    location: '',
    duration: '',
    description: ''
  });
  const [ads, setAds] = useState([]);

  // LOG DE RENDU PRINCIPAL
  console.log("--- ARTISAN RENDER --- Solde actuel dans l'état:", soldeCredits);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // Fonction pour obtenir le prix (inchangée)
  const getPrice = (pack) => {
    switch (pack) {
      case 3: return "15 000 F";
      case 5: return "22 500 F";
      case 10: return "40 000 F";
      default: return "0 F";
    }
  };

  const fetchAds = async (userId) => {
    if (!userId) return;
    const q = query(collection(db, "ads"), where("artisanId", "==", userId));
    try {
        const querySnapshot = await getDocs(q);
        const adsList = [];
        querySnapshot.forEach((doc) => {
            adsList.push({ id: doc.id, ...doc.data() });
        });
        setAds(adsList);
    } catch (error) {
        console.error("Erreur lors du fetch des annonces:", error);
    }
  };
  
  // ----------------------------------------------------------------------
  // SYSTEME DE RECUPERATION EN TEMPS REEL (Gestion du loading + Notifications)
  // ----------------------------------------------------------------------
  // --- GESTION DU PROFIL ET DES COMPTEURS EN TEMPS RÉEL ---
  useEffect(() => {
    let unsubUser;
    let unsubNotifs;
    let unsubMessages;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 1. Écoute du solde et nom
        unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) {
            setSoldeCredits(Number(docSnap.data().credits) || 0);
            setUserName(docSnap.data().name || 'Artisan');
          }
          setLoading(false);
        });

        // 2. Écoute des notifications (la cloche)
        const qNotif = query(collection(db, "notifications"), where("toId", "==", user.uid));
        unsubNotifs = onSnapshot(qNotif, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setNotifications(list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        });

        // 3. Écoute des messages NON LUS (le badge mallette)
        const qMsg = query(
          collection(db, "messages"), 
          where("toId", "==", user.uid), 
          where("seen", "==", false)
        );
        unsubMessages = onSnapshot(qMsg, (snap) => {
          console.log("Nouveaux messages détectés:", snap.docs.length);
          setUnreadMessagesCount(snap.docs.length);
        });

        fetchAds(user.uid);
      } else {
        setLoading(false);
        navigate('/');
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubUser) unsubUser();
      if (unsubNotifs) unsubNotifs();
      if (unsubMessages) unsubMessages();
    };
  }, [navigate]);

const handleDeleteNotification = (id) => {
  setNotifications(prev => prev.filter(n => n.id !== id));
  // Optionnel : deleteDoc(doc(db, "notifications", id));
};
  // ----------------------------------------------------------------------
  // LOGIQUE handleSubmit
  // ----------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      alert("Erreur d'authentification. Veuillez vous reconnecter.");
      return;
    }

    const currentPrice = ads.length === 0 ? AD_COST_PROMO : AD_COST_NORMAL;
    
    // Vérification du solde
    if (soldeCredits < currentPrice) {
      // On remplace AD_COST par currentPrice
alert(`Fonds insuffisants. Cette annonce coûte ${currentPrice} crédit(s). Votre solde actuel est de ${soldeCredits}. Veuillez acheter des crédits.`);
      return;
    }
    
    try {
      // 1. Publication de l'annonce (inchangé)
      await addDoc(collection(db, "ads"), { 
          ...formData, 
          artisanId: auth.currentUser.uid, 
          createdAt: serverTimestamp() 
      });
      
      // 2. Décrémentation du solde (Utilisation de l'état local actuel)
      const userRef = doc(db, "users", auth.currentUser.uid);
      const newCredits = soldeCredits - currentPrice;
      // Utilisation d'updateDoc simple
      await updateDoc(userRef, { credits: newCredits });
      
      setSoldeCredits(newCredits);
      
      setShowModal(false);
      setFormData({
          jobType: '',
          numPeople: '',
          amount: '',
          remunerationMode: '',
          location: '',
          duration: '',
          description: ''
      });
      fetchAds(auth.currentUser.uid); 
      alert(`Annonce publiée ! ${AD_COST_NORMAL} crédit(s) déduit(s).`);
    } catch (error) {
      console.error("Erreur publication :", error);
      alert("Erreur lors de la publication.");
    }
  };
  // ----------------------------------------------------------------------

  // ----------------------------------------------------------------------
  // LOGIQUE handleFinalPayment (Achat de crédits)
  // ----------------------------------------------------------------------
  const handleFinalPayment = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 8) {
      alert("Numéro de téléphone invalide.");
      return;
    }
    
    const creditsToPurchase = selectedPack; 
    
    try {
        const user = auth.currentUser;
        if (!user) {
          alert("Erreur: Utilisateur non connecté.");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        
        // Relire le doc pour éviter les conditions de course lors de l'incrémentation
        const userDoc = await getDoc(userRef);

        const currentCredits = userDoc.exists() ? (Number(userDoc.data().credits) || 0) : 0;
        const newTotalCredits = currentCredits + creditsToPurchase;
        
        await updateDoc(userRef, { credits: newTotalCredits });
        
        setShowBuyCreditModal(false);
        setShowPaymentForm(false);
        setPhoneNumber(''); 
        
        alert(`${creditsToPurchase} crédits ajoutés avec succès ! Votre nouveau solde sera bientôt visible.`);
        
    } catch (error) {
        console.error("Erreur achat :", error);
        alert("Erreur lors du paiement. Veuillez réessayer.");
    }
  };

  const handleDeleteAd = async (adId) => {
  const confirmDelete = window.confirm("Voulez-vous vraiment supprimer cette annonce ?");
  if (confirmDelete) {
    try {
      await deleteDoc(doc(db, "ads", adId));
      // La mise à jour sera automatique grâce au onSnapshot déjà présent
    } catch (error) {
      console.error("Erreur de suppression:", error);
      alert("Erreur lors de la suppression de l'annonce.");
    }
  }
};
  // ----------------------------------------------------------------------
{/* Dans Artisan.js, ligne ~264 */}
<a href="/artisan-candidatures" className="nav-link">
   {/* ... svg ... */}
   <span>Candidatures</span>
</a>
  // 🛑 GESTION DE L'AFFICHAGE PENDANT LE CHARGEMENT 🛑
  if (loading) {
  return (
    <div className="artisan-page">
      <div className="artisan-container">
        {/* Barre de navigation skeleton */}
        <div style={{ height: '60px', width: '100%', marginBottom: '20px' }} className="skeleton"></div>
        
        {/* Profil skeleton */}
        <div className="profile-card skeleton" style={{ height: '150px', marginBottom: '30px', border: 'none' }}></div>
        
        {/* Actions grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
           <div style={{ height: '100px' }} className="skeleton"></div>
           <div style={{ height: '100px' }} className="skeleton"></div>
        </div>

        {/* Liste des annonces skeleton */}
        <div style={{ height: '40px', width: '200px', marginBottom: '15px' }} className="skeleton"></div>
        <div className="skeleton" style={{ height: '200px', borderRadius: '20px' }}></div>
      </div>
    </div>
  );
}



  
  return (
    <div className="artisan-page">
      {/* --- HEADER --- */}
     <header className="artisan-header">
 <div className="header-left">
  <div className="logo-container">
    <div className="logo-badge">
      <img src={logoIm} alt="JKL Logo" className="logo-img" />
      <span>JKL Global Service</span>
    </div>
  </div>
</div>

  <div className="header-center">
    <CreditDisplay credits={soldeCredits} />
  </div>

  <div className="header-right">
    <div className="actions-group">
      {/* Bouton Candidatures */}
      {/* Bouton Candidatures avec Badge numérique */}
{/* Bouton Candidatures avec Badge */}
<a href="/artisan-candidatures" className="icon-btn-circle" title="Candidatures" style={{ position: 'relative' }}>
  <i className="fas fa-briefcase"></i>
  {unreadMessagesCount > 0 && (
    <span className="notification-badge-dot">{unreadMessagesCount}</span>
  )}
</a>
      {/* Bouton Notifications */}
      {/* Bouton Notifications avec structure Chercheur */}
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
    <div className="dropdown-header-top">
      <h4>Notifications</h4>
      <button className="btn-close-notif" onClick={() => setShowNotificationsDropdown(false)}>
        &times;
      </button>
    </div>
    
    <ul className="notif-list-ui">
      {notifications.length === 0 ? (
        <li className="no-notif">Aucune notification</li>
      ) : (
        notifications.map((notif) => (
          <li key={notif.id} className="notif-item-ui">
            <div className="notif-body-content">
              {/* Force l'affichage du message avec un fallback au cas où */}
              <p className="notif-text-main">
                {notif.message || `${notif.seekerName} a postulé à votre offre.`}
              </p>
              <span className="notif-date-sub">
                {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString('fr-FR') : 'Récemment'}
              </span>
            </div>
            <button className="btn-trash-notif" onClick={() => handleDeleteNotification(notif.id)}>
              <i className="fas fa-trash-alt"></i>
            </button>
          </li>
        ))
      )}
    </ul>
  </div>
)}
</div>
    </div>

   <div className="user-section">
  {/* Ce bloc disparaît sur mobile via CSS */}
  <div className="user-profile-info">
    <span className="user-name">{userName}</span>
    <span className="user-role">Artisan</span>
  </div>
  
  {/* Conteneur pour l'avatar et le logout */}
  <div className="user-actions-mobile">
    <div className="user-avatar-mobile" title={userName}>
      {userName ? userName.charAt(0).toUpperCase() : 'A'}
    </div>

    <button
  className="logout-btn-simple"
  title="Déconnexion"
  onClick={async () => {
    await auth.signOut();
    navigate('/');
  }}
>
  <i className="fas fa-sign-out-alt"></i>
</button>
  </div>
</div>
  </div>
</header>
      
      <main className="artisan-container">
        
        <section className="welcome-banner">
          <h1>Bienvenue sur JKL Global Service</h1>
          <p className="banner-subtitle">
            La plateforme qui connecte les artisans et employeurs avec les meilleurs talents. Publiez vos annonces de recrutement et trouvez rapidement les professionnels dont vous avez besoin.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>
              </div>
              <h3>Ciblage précis</h3>
              <p>Atteignez les candidats qualifiés</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              </div>
              <h3>Rapide & efficace</h3>
              <p>Recrutez en quelques clics</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              </div>
              <h3>Qualité garantie</h3>
              <p>Candidats vérifiés et motivés</p>
            </div>
          </div>
        </section>

        {/* 🔄 NOUVELLE STRUCTURE DU BLOC DE RECRUTEMENT 🔄 */}
        <section className="dashboard-card recruitment-section-new">
            
            {/* Ligne 1: Titre et bouton Lancer Recrutement */}
            <div className="recruitment-header-new">
                <div className="recruitment-title-info">
                    <h2>Vous cherchez du personnel ?</h2>
                    <p>
                        Créez une annonce de recrutement en quelques minutes et recevez des candidatures qualifiées.
                    </p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Lancer un recrutement
                </button>
            </div>

            {/* Séparateur visuel */}
            <hr className="recruitment-separator" />

            {/* Ligne 2: Solde et bouton Acheter crédits */}
            <div className="credit-management-area">
                {/* Carte d'affichage du solde */}
                <div className="current-credits-box">
                    <div className="credit-icon-large">
                        {/* Utilisation de l'icône de l'image (O entouré d'un cercle) */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="14" fill="#2563eb">C</text></svg>
                    </div>
                    <div className="credit-text">
                        <span className="credit-label">Vos crédits disponibles</span>
                        <span className="credit-value">{soldeCredits} crédit(s)</span>
                    </div>
                </div>

                <button className="btn-buy-credit-large" onClick={() => {
                    setShowBuyCreditModal(true);
                    setShowPaymentForm(false); 
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                    Acheter des crédits
                </button>
            </div>

            {/* Ligne 3: Rappel d'achat */}
            <div className="credit-reminder-box">
    <span className="reminder-icon">💡</span>
    <p className="reminder-text">
        **Rappel:** Il vous faut **{AD_COST_NORMAL} crédit** pour publier une annonce (après votre offre de bienvenue).
    </p>
</div>

        </section>
        {/* -------------------------------------------------------- */}


        {/* Modal d'achat de crédits */}
        {showBuyCreditModal && (
          <div className="modal-overlay">
            <div className="modal-content buy-credit-modal">
              <h2 className="credit-modal-title">Acheter des crédits</h2>
              
              {!showPaymentForm ? (
                <>
                  <div className="credit-subtitle">Minimum 3 crédits requis</div>
                  <div className="credit-info-box">
                    <b>
                      <svg width="18" height="18" style={{verticalAlign:'middle',marginRight:4}} fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      Comment ça marche ?
                    </b>
                   <p>
  Achetez des crédits pour publier vos annonces de recrutement. **1 crédit = {AD_COST_NORMAL} publication d'annonce.**<br />
  Plus vous achetez, plus vous économisez !
</p>
                  </div>
                  <div className="credit-pack-list">
                    <div className={`credit-pack${selectedPack === 3 ? " selected" : ""}`} onClick={() => setSelectedPack(3)}>
                      <div className="credit-pack-icon">
                        <svg width="32" height="32" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      </div>
                      <div className="credit-pack-title">3 crédits</div>
                      <div className="credit-pack-price">15 000 F</div>
                      <div className="credit-pack-unit">5 000 F / crédit</div>
                      {selectedPack === 3 && <div className="credit-pack-check">✔</div>}
                    </div>
                    <div className={`credit-pack${selectedPack === 5 ? " selected" : ""}`} onClick={() => setSelectedPack(5)}>
                      <div className="credit-pack-popular">★ Populaire</div>
                      <div className="credit-pack-icon">
                        <svg width="32" height="32" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      </div>
                      <div className="credit-pack-title">5 crédits</div>
                      <div className="credit-pack-price">22 500 F</div>
                      <div className="credit-pack-unit">4 500 F / crédit</div>
                      <div className="credit-pack-reduction">10% de réduction</div>
                      {selectedPack === 5 && <div className="credit-pack-check">✔</div>}
                    </div>
                    <div className={`credit-pack${selectedPack === 10 ? " selected" : ""}`} onClick={() => setSelectedPack(10)}>
                      <div className="credit-pack-icon">
                        <svg width="32" height="32" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                      </div>
                      <div className="credit-pack-title">10 crédits</div>
                      <div className="credit-pack-price">40 000 F</div>
                      <div className="credit-pack-unit">4 000 F / crédit</div>
                      <div className="credit-pack-reduction">20% de réduction</div>
                      {selectedPack === 10 && <div className="credit-pack-check">✔</div>}
                    </div>
                  </div>
                  <div className="credit-summary">
                    <div className="credit-summary-title">Récapitulatif</div>
                    <div className="credit-summary-row">
                      <span>Crédits sélectionnés</span>
                      <b>{selectedPack} crédits</b>
                    </div>
                    <div className="credit-summary-row">
                      <span>Montant total</span>
                      <b style={{color:'#2563eb',fontSize:'1.15em'}}>
                        {getPrice(selectedPack)}
                      </b>
                    </div>
                  </div>
                  <div className="credit-modal-actions">
                    <button type="button" onClick={() => setShowBuyCreditModal(false)}>Annuler</button>
                    <button className="btn-modal-submit" onClick={() => setShowPaymentForm(true)}>Continuer</button>
                  </div>
                </>
              ) : (
                <form className="payment-form" onSubmit={handleFinalPayment}>
                  <div className="payment-header-info">
                    <h3>Paiement de l'abonnement</h3>
                    <p>Vous êtes sur le point d'acheter **{selectedPack} crédits** pour un montant de **{getPrice(selectedPack)}**.</p>
                  </div>
                  <div className="form-group">
                    <label>Sélectionnez un mode de paiement</label>
                    <div className="payment-method-selector">
                      <div className={`payment-option ${paymentMethod === 'mtn' ? 'selected' : ''}`} onClick={() => setPaymentMethod('mtn')}>
                        <div className="icon mtn"></div>
                        <span>MTN Mobile Money</span>
                      </div>
                      <div className={`payment-option ${paymentMethod === 'orange' ? 'selected' : ''}`} onClick={() => setPaymentMethod('orange')}>
                        <div className="icon orange"></div>
                        <span>Orange Money</span>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phoneNumber">Numéro de téléphone ({paymentMethod.toUpperCase()})</label>
                    <input id="phoneNumber" name="phoneNumber" type="tel" placeholder="Ex: 699XXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} required />
                  </div>
                  <div className="payment-tip">
                    <span className="tip-icon">⚠️</span>
                    Vous recevrez une requête de paiement sur votre téléphone. Veuillez la valider pour finaliser.
                  </div>
                  <div className="credit-modal-actions payment-actions">
                    <button type="button" onClick={() => setShowPaymentForm(false)}>&larr; Retour</button>
                    <button type="submit" className="btn-modal-submit">Payer {getPrice(selectedPack)}</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal de création d'annonce */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Créer une annonce de recrutement</h2>
                <button className="modal-close-btn" onClick={() => setShowModal(false)}>&times;</button>
              </div>
              <form className="recruitment-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="jobType">Type de poste</label>
                  <input id="jobType" name='jobType' type="text" placeholder="Ex: Plombier, Électricien..."  value={formData.jobType} onChange={handleFormChange} required/>
                </div>
                <div className="form-row">
                  <div className="form-group half-width">
                    <label htmlFor="numPeople">Nombre de personnes</label>
                    <input id="numPeople" name="numPeople" type="number" placeholder="Ex: 2" value={formData.numPeople} onChange={handleFormChange} required min="1"/>
                  </div>
                  <div className="form-group half-width">
                    <label htmlFor="amount"> $ Montant (Fcfa)</label>
                    <input id="amount" name="amount" type="number" placeholder="Ex: 2000" value={formData.amount} onChange={handleFormChange} required min="0"/>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group half-width">
                    <label htmlFor="remunerationMode">Mode de rémunération</label>
                    <select id="remunerationMode" name="remunerationMode" value={formData.remunerationMode} onChange={handleFormChange} required>
                      <option value="">Sélectionnez un mode</option>
                      <option value="Journalier">Journalier</option>
                      <option value="Hebdomadaire">Hebdomadaire</option>
                      <option value="Mensuel">Mensuel</option>
                      <option value="Tâche terminée">Tâche terminée</option>
                    </select>
                  </div>
                  <div className="form-group half-width">
                    <label htmlFor="location">Localisation</label>
                    <input id="location" name="location" type="text" placeholder="Ex: Paris, France" value={formData.location} onChange={handleFormChange} required/>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="duration">Durée du contrat</label>
                  <select id="duration" name="duration" value={formData.duration} onChange={handleFormChange} required>
                    <option value="">Sélectionnez une durée</option>
                    <option value="une semaine">une semaine</option>
                    <option value="un mois">un mois</option>
                    <option value="un an">un an</option>
                    <option value="non défini">non défini</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description du poste</label>
                  <textarea id="description" name="description" rows="4" placeholder="Décrivez..." value={formData.description} onChange={handleFormChange} required></textarea>
                </div>
                <button type="submit" className="btn-modal-submit">
  {ads.length === 0 
    ? "Publier l'annonce (Gratuit - Bienvenue)" 
    : `Publier l'annonce (${AD_COST_NORMAL} crédit)`}
</button>
              </form>
            </div>
          </div>
        )}

        <section className="dashboard-card ads-section">
          <div className="ads-header">
            <h2>Mes annonces</h2>
            <span className="ads-count">{ads.length} annonce(s)</span>
          </div>
          <div className="ads-list">
            {ads.length === 0 ? (
              <div className="empty-state">
                <p>Aucune annonce publiée</p>
              </div>
            ) : (
              ads.map(ad => (
  <div className="ad-card" key={ad.id}>
    <div className="ad-card-header">
      <h3>{ad.jobType}</h3>
      <span className="ad-badge-live">En ligne</span>
    </div>

    <div className="ad-card-info">
      <span className="info-tag"><i className="fas fa-users"></i> {ad.numPeople}</span>
      <span className="info-tag budget"><i className="fas fa-coins"></i> {Number(ad.amount).toLocaleString()} F</span>
    </div>

    <p className="ad-description-short">{ad.description}</p>

    <div className="ad-card-footer-action">
      {/* ON REMPLACE LE LIEN CANDIDATURE PAR LE BOUTON SUPPRIMER */}
      <button 
        className="btn-delete-instant" 
        onClick={() => handleDeleteAd(ad.id)}
      >
        <i className="fas fa-trash-alt"></i> Supprimer l'annonce
      </button>
      
      <span className="ad-date-small">
        {ad.createdAt?.toDate ? ad.createdAt.toDate().toLocaleDateString('fr-FR') : ''}
      </span>
    </div>
  </div>
))
            )}
          </div>
        </section>
      </main>
      <button className="help-fab">?</button>
    </div>
  );
};

export default Artisan;