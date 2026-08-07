import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-analytics.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    addDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Configurações do projeto Firebase da Ponte Solidária
const firebaseConfig = {
    apiKey: "AIzaSyBMaOTa-MvOli9orpuCmbzDDeeX9s7IMyA",
    authDomain: "pontesolidaria-18d1c.firebaseapp.com",
    projectId: "pontesolidaria-18d1c",
    storageBucket: "pontesolidaria-18d1c.firebasestorage.app",
    messagingSenderId: "343801850382",
    appId: "1:343801850382:web:48a2b10a2459b18d682a5f",
    measurementId: "G-6GZGJJ7H0H"
};

// Inicialização das instâncias do Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Objeto global reutilizado pelos demais scripts do projeto (js/firebase-auth.js, js/perfil.js, js/doacoes.js)
window.fb = {
    app,
    auth,
    db,
    analytics,
    authSdk: {
        onAuthStateChanged,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        setPersistence,
        browserLocalPersistence,
        browserSessionPersistence
    },
    firestoreSdk: {
        doc,
        getDoc,
        setDoc,
        updateDoc,
        deleteDoc,
        collection,
        addDoc,
        getDocs,
        onSnapshot,
        query,
        where,
        orderBy,
        limit
    }
};

// Dispara o evento de sincronização para inicialização dos formulários
document.dispatchEvent(new Event("firebaseReady"));