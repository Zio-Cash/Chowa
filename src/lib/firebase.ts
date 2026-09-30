import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

// ⬇️⬇️⬇️  INCOLLA QUI LA CONFIGURAZIONE DEL TUO PROGETTO FIREBASE  ⬇️⬇️⬇️
// La trovi in: console.firebase.google.com → ⚙️ Impostazioni progetto →
// sezione "Le tue app" → icona web </> → "Configurazione SDK".
// Questi valori sono pubblici (identificano il progetto): la sicurezza è
// garantita dalle regole Firestore, non dal nasconderli.
const firebaseConfig = {
  apiKey: 'AIzaSyCWUL_8xZUeGV0Io3veZK9HDD1AIYQRdgE',
  authDomain: 'health-progress-400cc.firebaseapp.com',
  projectId: 'health-progress-400cc',
  storageBucket: 'health-progress-400cc.firebasestorage.app',
  messagingSenderId: '472719536657',
  appId: '1:472719536657:web:2261cd2d151f9ffb7837b0',
}
// ⬆️⬆️⬆️  FINE CONFIGURAZIONE  ⬆️⬆️⬆️

/** true quando la config è stata compilata (non ci sono più i placeholder). */
export const firebaseReady = !Object.values(firebaseConfig).includes('INCOLLA_QUI')

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Firestore con cache locale persistente (IndexedDB): l'app si apre e mostra
// i dati anche senza connessione, e sincronizza quando la rete torna.
// Se IndexedDB non è disponibile (es. finestra privata) si degrada da solo.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

export const googleProvider = new GoogleAuthProvider()
