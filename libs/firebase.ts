// Firebase client-side configuration
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

function initializeFirebase() {
    if (typeof window !== 'undefined') {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        // Firestore設定を最適化（パフォーマンス向上）
        db = getFirestore(app, {
            // キャッシュを有効化してオフライン対応とパフォーマンス向上
            experimentalForceLongPolling: false,
            // ローカルキャッシュを有効化
            localCache: {
                kind: 'persistent',
            },
        });
        auth = getAuth(app);
        storage = getStorage(app);
    }
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
    initializeFirebase();
}

export { app, db, auth, storage };
export default app!;
