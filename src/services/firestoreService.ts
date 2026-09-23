import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../lib/firebase.ts";
import { BeritaAcaraRFS } from "../types.ts";

const COLLECTION_NAME = "beritaAcara";

/**
 * Fetch all BA-RFS records stored in Firestore
 */
export async function fetchRecordsFromFirestore(): Promise<BeritaAcaraRFS[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const records: BeritaAcaraRFS[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as any;
      records.push({
        ...data,
        id: docSnap.id
      });
    });

    return records;
  } catch (error) {
    console.warn("Firestore fetchRecords error, falling back to local:", error);
    throw error;
  }
}

/**
 * Save or update a BA-RFS record in Firestore
 */
export async function saveRecordToFirestore(record: BeritaAcaraRFS): Promise<void> {
  try {
    const docId = record.id || `rfs_${Date.now()}`;
    const docRef = doc(db, COLLECTION_NAME, docId);

    // Sanitize undefined fields for Firestore
    const cleanData: Record<string, any> = { ...record, id: docId };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    cleanData.updatedAtCloud = serverTimestamp();

    // Guard with a 2.5-second timeout so offline/slow Firestore never hangs the app
    const savePromise = setDoc(docRef, cleanData, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore operation timed out")), 2500)
    );

    await Promise.race([savePromise, timeoutPromise]);
  } catch (error) {
    console.warn("Firestore saveRecord warning (continuing locally):", error);
  }
}

/**
 * Delete a BA-RFS record from Firestore
 */
export async function deleteRecordFromFirestore(recordId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, recordId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Firestore deleteRecord error:", error);
    throw error;
  }
}
