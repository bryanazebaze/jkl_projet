import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import './artisanCandidatures.css';

const ArtisanCandidatures = () => {
  const [candidatures, setCandidatures] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({}); // { seekerId_adId: count }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) return;

      // 1. Écouter les candidatures
      const qCandi = query(
        collection(db, "candidatures"), 
        where("artisanId", "==", user.uid)
      );

      const unsubCandi = onSnapshot(qCandi, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCandidatures(list);
        setLoading(false);
      });

      // 2. Écouter les messages non lus avec une clé combinée (seekerId + adId)
      const qMsg = query(
        collection(db, "messages"),
        where("toId", "==", user.uid),
        where("seen", "==", false)
      );

      const unsubMsg = onSnapshot(qMsg, (snapshot) => {
        const counts = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // On crée une clé unique pour identifier la conversation précise
          const key = `${data.fromId}_${data.adId}`; 
          counts[key] = (counts[key] || 0) + 1;
        });
        setUnreadCounts(counts);
      });

      return () => { unsubCandi(); unsubMsg(); };
    });
    return () => unsubscribeAuth();
  }, []);

 if (loading) {
  return (
    <div className="artisan-candidatures-page">
      {/* Header Skeleton */}
      <div className="skeleton-header skeleton"></div>
      
      {/* Shortcuts Skeleton */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="skeleton-shortcut skeleton"></div>
            <div className="skeleton skeleton" style={{ width: '40px', height: '10px' }}></div>
          </div>
        ))}
      </div>

      {/* Grid Skeleton */}
      <div className="candidats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-card skeleton"></div>
        ))}
      </div>
    </div>
  );
}
  return (
    <div className="artisan-candidatures-page">
      <header className="page-header-premium">
        <button className="btn-back-circle" onClick={() => window.location.href = "/Artisan"}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-text">
          <h2>Candidatures</h2>
          <p>{candidatures.length} talents ont postulé</p>
        </div>
      </header>

      {/* SHORTCUTS AVEC BADGES ET LIENS DIRECTS */}
      {candidatures.length > 0 && (
        <div className="shortcuts-section">
          <p className="shortcuts-title">Messages rapides</p>
          <div className="shortcuts-list">
            {candidatures.slice(0, 8).map(cand => {
              const msgKey = `${cand.seekerId}_${cand.adId}`;
              const count = unreadCounts[msgKey] || 0;
              
              return (
                <div 
                  key={cand.id} 
                  className="shortcut-item"
                  onClick={() => window.location.href = `/chat?seekerId=${cand.seekerId}&adId=${cand.adId}`}
                >
                  <div className="shortcut-avatar-wrapper">
                    <div className={`shortcut-avatar ${count > 0 ? 'active-border' : ''}`}>
                      {cand.seekerName?.charAt(0).toUpperCase()}
                    </div>
                    {count > 0 && <span className="shortcut-badge">{count}</span>}
                  </div>
                  <span>{cand.seekerName?.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LISTE DES CARTES (GRID) */}
      <div className="candidats-grid">
        {candidatures.map((cand) => {
          const msgKey = `${cand.seekerId}_${cand.adId}`;
          const count = unreadCounts[msgKey] || 0;
          return (
            <div className="candidat-card-premium" key={cand.id}>
              <div className="card-top">
                <span className="job-badge-tag">{cand.jobType}</span>
                <span className="postule-date">
                  {cand.createdAt?.toDate ? cand.createdAt.toDate().toLocaleDateString() : 'Récemment'}
                </span>
              </div>

              <div className="candidat-main-info">
                <div className="candidat-avatar-large">
                  {cand.seekerName?.charAt(0).toUpperCase()}
                </div>
                <div className="candidat-details">
                  <h3>{cand.seekerName}</h3>
                  <p><i className="fas fa-map-marker-alt"></i> {cand.location || "Cameroun"}</p>
                </div>
              </div>

              <div className="job-brief-box">
                <div className="brief-item">
                  <span className="label">Budget</span>
                  <span className="value">{Number(cand.amount).toLocaleString()} F</span>
                </div>
                <div className="brief-item">
                  <span className="label">Mode</span>
                  <span className="value">{cand.remunerationMode}</span>
                </div>
              </div>

              <button 
                className={`btn-action-chat ${count > 0 ? 'has-unread' : ''}`}
                onClick={() => window.location.href = `/chat?seekerId=${cand.seekerId}&adId=${cand.adId}`}
              >
                <i className="fas fa-comments"></i>
                {count > 0 ? `Répondre (${count})` : "Discuter"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArtisanCandidatures;