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
import { db, auth } from "../lib/firebase.ts";
import { BeritaAcaraRFS, PoMaterialRequest } from "../types.ts";

const COLLECTION_RFS = "beritaAcara";
const COLLECTION_PO = "poMaterial";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId
    },
    operationType,
    path
  };
  console.warn("Firestore Error Context: ", JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Fetch all BA-RFS records stored in Firestore
 */
export async function fetchRecordsFromFirestore(): Promise<BeritaAcaraRFS[]> {
  try {
    const colRef = collection(db, COLLECTION_RFS);
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
    handleFirestoreError(error, OperationType.LIST, COLLECTION_RFS);
    throw error;
  }
}

/**
 * Save or update a BA-RFS record in Firestore
 */
export async function saveRecordToFirestore(record: BeritaAcaraRFS): Promise<void> {
  const docId = record.id || `rfs_${Date.now()}`;
  try {
    const docRef = doc(db, COLLECTION_RFS, docId);

    // Sanitize undefined fields for Firestore
    const cleanData: Record<string, any> = { ...record, id: docId };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    cleanData.updatedAtCloud = serverTimestamp();

    const savePromise = setDoc(docRef, cleanData, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore operation timed out")), 3000)
    );

    await Promise.race([savePromise, timeoutPromise]);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_RFS}/${docId}`);
  }
}

/**
 * Delete a BA-RFS record from Firestore
 */
export async function deleteRecordFromFirestore(recordId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_RFS, recordId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_RFS}/${recordId}`);
    throw error;
  }
}

/**
 * Fetch all PO Material records stored in Firestore
 */
export async function fetchPoRecordsFromFirestore(): Promise<PoMaterialRequest[]> {
  try {
    const colRef = collection(db, COLLECTION_PO);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const records: PoMaterialRequest[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data() as any;
      records.push({
        ...data,
        id: docSnap.id
      });
    });

    return records;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_PO);
    throw error;
  }
}

/**
 * Save or update a PO Material record in Firestore
 */
export async function savePoRecordToFirestore(record: PoMaterialRequest): Promise<void> {
  const docId = record.id || `po_${Date.now()}`;
  try {
    const docRef = doc(db, COLLECTION_PO, docId);

    const cleanData: Record<string, any> = { ...record, id: docId };
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    cleanData.updatedAtCloud = serverTimestamp();

    const savePromise = setDoc(docRef, cleanData, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore save PO timed out")), 3000)
    );

    await Promise.race([savePromise, timeoutPromise]);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COLLECTION_PO}/${docId}`);
  }
}

/**
 * Delete a PO Material record from Firestore
 */
export async function deletePoRecordFromFirestore(recordId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_PO, recordId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_PO}/${recordId}`);
    throw error;
  }
}

