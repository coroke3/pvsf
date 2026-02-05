// Firebase Admin SDK for server-side operations
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

function initializeAdmin() {
    if (!getApps().length) {
        let serviceAccount: object | undefined;
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (key) {
            try {
                serviceAccount = JSON.parse(key);
            } catch (e) {
                console.warn('FIREBASE_SERVICE_ACCOUNT_KEY parse failed:', e);
            }
        }

        if (serviceAccount) {
            adminApp = initializeApp({
                credential: cert(serviceAccount),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        } else {
            // Fallback for development (uses GOOGLE_APPLICATION_CREDENTIALS)
            adminApp = initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        }
    } else {
        adminApp = getApps()[0];
    }

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
}

// Initialize on first import
initializeAdmin();

export { adminApp, adminDb, adminAuth };
