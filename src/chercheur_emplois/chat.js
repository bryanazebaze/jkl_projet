import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import './chat.css'; 
import { useLocation } from "react-router-dom";

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [recipientStatus, setRecipientStatus] = useState({ online: false, lastSeen: null });
  const scrollRef = useRef();
  const fileInputRef = useRef(); // AJOUTÉ : Référence pour le fichier

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  
  const adId = params.get("adId");
  const employerId = params.get("employerId");
  const seekerId = params.get("seekerId");
  const recipientId = employerId || seekerId;

  // 1. GESTION DE LA PRÉSENCE
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const updateStatus = (status) => {
        updateDoc(userRef, { 
          isOnline: status, 
          lastSeen: serverTimestamp() 
        });
      };
      updateStatus(true);
      const handleVisibility = () => {
        updateStatus(document.visibilityState === 'visible');
      };
      document.addEventListener("visibilitychange", handleVisibility);
      return () => {
        updateStatus(false);
        document.removeEventListener("visibilitychange", handleVisibility);
        unsubscribe();
      };
    }
  }, [currentUser]);

  // 2. ÉCOUTER LE STATUT DE L'INTERLOCUTEUR
  useEffect(() => {
    if (!recipientId) return;
    const unsub = onSnapshot(doc(db, "users", recipientId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipientStatus({
          online: data.isOnline || false,
          lastSeen: data.lastSeen || null
        });
      }
    });
    return () => unsub();
  }, [recipientId]);

  // 3. ÉCOUTE DES MESSAGES + LOGIQUE DU "VU"
  useEffect(() => {
    if (!adId || !currentUser || !recipientId) return; 

    const q = query(collection(db, "messages"), where("adId", "==", adId));
    
    const unsub = onSnapshot(q, (snapshot) => {
      let msgsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filteredMsgs = msgsList.filter(m => 
        (m.fromId === currentUser.uid && m.toId === recipientId) || 
        (m.fromId === recipientId && m.toId === currentUser.uid)
      );
      filteredMsgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(filteredMsgs);

      snapshot.docs.forEach((msgDoc) => {
        const data = msgDoc.data();
        if (data.fromId === recipientId && data.toId === currentUser.uid && !data.seen) {
          updateDoc(doc(db, "messages", msgDoc.id), { seen: true });
        }
      });
    });
    return () => unsub();
  }, [adId, currentUser, recipientId]);

  // 4. AUTO-SCROLL
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. ENVOI DE MESSAGE TEXTE
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentUser || !recipientId) return;
    const text = input;
    setInput('');
    try {
      await addDoc(collection(db, "messages"), {
        fromId: currentUser.uid,
        toId: recipientId,
        adId: adId,
        content: text.trim(),
        createdAt: serverTimestamp(),
        seen: false
      });
    } catch (err) {
      console.error(err);
      setInput(text);
    }
  };

  // 6. GESTION DES FICHIERS (AJOUTÉ)
  const handleAttachClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser || !recipientId) return;

    // Simulation d'envoi de fichier (Nom + Icone)
    const fileMessage = `📁 Fichier : ${file.name}`;
    try {
      await addDoc(collection(db, "messages"), {
        fromId: currentUser.uid,
        toId: recipientId,
        adId: adId,
        content: fileMessage,
        isFileType: true, // Tag pour le style CSS
        createdAt: serverTimestamp(),
        seen: false
      });
    } catch (err) {
      console.error("Erreur fichier:", err);
    }
  };

  return (
    <div className="chat-page-pro">
      <header className="chat-header-pro">
        <button className="btn-retour-pro" onClick={() => window.history.back()}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="header-user-info">
          <div className="user-avatar-small"><i className="fas fa-user"></i></div>
          <div>
            <h2>{employerId ? "Employeur" : "Candidat"}</h2>
            <div className="status-indicator">
              <span className={recipientStatus.online ? "dot-online" : "dot-offline"}></span> 
              <span className="status-text">
                {recipientStatus.online ? "En ligne" : recipientStatus.lastSeen ? `Vu le ${recipientStatus.lastSeen.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : "Hors ligne"}
              </span>
            </div>
          </div>
        </div>
      </header>
      
      <div className="chat-messages-container">
        {messages.map((msg) => {
          const isMe = currentUser && msg.fromId === currentUser.uid;
          return (
            <div className={`message-wrapper ${isMe ? 'me' : 'other'}`} key={msg.id}>
              <div className="message-bubble">
                <div className="bubble-text">
                  {msg.isFileType ? (
                    <div className="file-box">
                      <i className="fas fa-file-download"></i>
                      <span>{msg.content.replace('📁 Fichier : ', '')}</span>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <div className="bubble-meta">
                  <span className="message-time">
                    {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) : '...'}
                  </span>
                  {isMe && <i className={`fas fa-check-double status-icon ${msg.seen ? 'seen' : ''}`}></i>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
      
      <div className="chat-footer">
        {/* Input caché pour les fichiers */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
        
        <form className="chat-input-wrapper-pro" onSubmit={sendMessage}>
          <button type="button" className="btn-attach" onClick={handleAttachClick}>
            <i className="fas fa-plus"></i>
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Taper un message..."
          />
          <button type="submit" className="btn-send-pro" disabled={!input.trim()}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;