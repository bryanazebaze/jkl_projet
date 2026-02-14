import React, { useEffect, useState, useMemo } from 'react';
import { auth, db } from '../firebase';
import { 
  getDocs, collection, query, where, onSnapshot 
} from 'firebase/firestore';
import './candi.css';

const MesCandidatures = () => {
  const [myCandidatures, setMyCandidatures] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // 1. Charger les candidatures ET les messages non lus ensemble
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      // CHARGEMENT DES CANDIDATURES
      const qCandi = query(collection(db, "candidatures"), where("seekerId", "==", user.uid));
      const querySnapshot = await getDocs(qCandi);
      const list = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const uniqueAds = list.filter((v, i, a) => v.paid && a.findIndex(t => t.adId === v.adId) === i);
      setMyCandidatures(uniqueAds);

      // ÉCOUTE DES MESSAGES NON LUS (Placé ici pour garantir que 'user' existe)
      const qMessages = query(
        collection(db, "messages"), 
        where("toId", "==", user.uid), 
        where("seen", "==", false)
      );

      const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
        const counts = {};
        snapshot.docs.forEach(doc => {
          const adId = doc.data().adId;
          counts[adId] = (counts[adId] || 0) + 1;
        });
        setUnreadCounts(counts);
      });

      // On nettoie l'écouteur de messages si l'utilisateur se déconnecte
      return () => unsubscribeMessages();
    });

    return () => unsubscribeAuth();
  }, []);

  const sortedCandidatures = useMemo(() => {
    return [...myCandidatures].sort((a, b) => {
      const countA = unreadCounts[a.adId] || 0;
      const countB = unreadCounts[b.adId] || 0;
      return countB - countA;
    });
  }, [myCandidatures, unreadCounts]);

  return (
    <div className="candidatures-container">
      <header className="candidatures-header-section">
        <button className="btn-back-pro" onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-text">
          <h2>Mes candidatures</h2>
          <p>{myCandidatures.length} poste(s) actifs</p>
        </div>
      </header>

      {/* --- SECTION DES RACCOURCIS --- */}
      {/* --- SECTION DES RACCOURCIS AVEC TRI DYNAMIQUE --- */}
{myCandidatures.length > 0 && (
  <div style={{ 
    marginBottom: '25px', 
    padding: '15px', 
    background: '#fff', 
    borderRadius: '20px', 
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)' 
  }}>
    <p style={{ fontWeight: '800', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '15px', textTransform: 'uppercase' }}>
      Conversations actives
    </p>
    <div style={{ display: 'flex', gap: '18px', overflowX: 'auto', paddingBottom: '10px' }}>
      {/* On crée une copie pour trier : ceux qui ont des messages (count > 0) passent devant */}
      {[...myCandidatures]
        .sort((a, b) => {
          const countA = unreadCounts[a.adId] || 0;
          const countB = unreadCounts[b.adId] || 0;
          return countB - countA; // Tri décroissant : le plus grand nombre de messages en premier
        })
        .map(cand => {
          const count = unreadCounts[cand.adId] || 0;

          return (
            <div 
              key={`shortcut-${cand.id}`} 
              style={{ textAlign: 'center', minWidth: '65px', cursor: 'pointer' }}
              onClick={() => window.location.href = `/chat?employerId=${cand.artisanId}&adId=${cand.adId}`}
            >
              <div style={{ 
                width: '60px', height: '60px', 
                background: count > 0 ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#e2e8f0', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: count > 0 ? 'white' : '#64748b', fontWeight: 'bold', fontSize: '1.2rem', margin: '0 auto',
                position: 'relative', border: count > 0 ? '3px solid #eff6ff' : '3px solid white', 
                boxShadow: count > 0 ? '0 4px 10px rgba(37,99,235,0.2)' : 'none',
                transition: 'all 0.4s ease' // Pour une transition fluide quand ça bouge
              }}>
                {cand.artisanName?.charAt(0).toUpperCase() || "?"}
                
                {count > 0 && (
                  <div style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    background: '#ef4444', color: 'white', fontSize: '0.7rem',
                    minWidth: '20px', height: '20px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white', fontWeight: '800'
                  }}>
                    {count}
                  </div>
                )}
              </div>
              <span style={{ 
                fontSize: '0.75rem', 
                color: count > 0 ? '#1e293b' : '#94a3b8', 
                fontWeight: count > 0 ? '800' : '600', 
                display: 'block', marginTop: '8px' 
              }}>
                {cand.jobType?.split(' ')[0]}
              </span>
            </div>
          );
      })}
    </div>
  </div>
)}

      {/* GRILLE DES CARTES */}
      <div className="candidatures-grid-pro">
        {sortedCandidatures.map(cand => {
          const count = unreadCounts[cand.adId] || 0;
          return (
            <div className={`candidature-card-premium ${count > 0 ? 'card-has-unread' : ''}`} key={cand.id}>
              {count > 0 && <div className="notif-badge-candi">{count}</div>}
              <div className="card-status-tag">Payé & Validé</div>
              <div className="job-main-info">
                <div className="job-icon-circle"><i className="fas fa-briefcase"></i></div>
                <div className="job-title-area">
                  <h3>{cand.jobType}</h3>
                  <span className="location-badge"><i className="fas fa-map-marker-alt"></i> {cand.location || "Cameroun"}</span>
                </div>
              </div>
              <div className="job-details-grid">
                <div className="detail-item">
                  <span className="label">Budget</span>
                  <span className="value-budget">{Number(cand.amount).toLocaleString()} FCFA</span>
                </div>
                <div className="detail-item">
                  <span className="label">Durée</span>
                  <span className="value">{cand.duration}</span>
                </div>
              </div>
              <div className="employer-mini-card">
                <div className="employer-row">
                   <div className="emp-avatar">{cand.artisanName?.charAt(0)}</div>
                   <div className="emp-info">
                     <p className="emp-name">{cand.artisanName}</p>
                     <p className="emp-contact">{cand.artisanContact}</p>
                   </div>
                </div>
              </div>
              <button 
                className={`btn-chat-premium ${count > 0 ? 'btn-msg-unread' : ''}`} 
                onClick={() => window.location.href = `/chat?employerId=${cand.artisanId}&adId=${cand.adId}`}
              >
                <i className="fas fa-comments"></i> {count > 0 ? `Répondre (${count})` : "Discuter"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MesCandidatures;