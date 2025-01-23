import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { getUserSubscription } from './subscription';

export interface DeviceInfo {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  lastActive: string;
  ipAddress: string;
  isCurrentDevice: boolean;
}

const MAX_DEVICES = {
  free: 1,
  premium: 5,
  business: Infinity
};

export async function registerDevice(user: User, deviceInfo: Omit<DeviceInfo, 'id'>) {
  if (!user) throw new Error('User not authenticated');

  const subscription = await getUserSubscription(user);
  const devices = await getUserDevices(user);
  
  // Check device limit based on subscription
  if (devices.length >= MAX_DEVICES[subscription] && !devices.some(d => d.isCurrentDevice)) {
    throw new Error(`Your ${subscription} plan allows maximum ${MAX_DEVICES[subscription]} devices`);
  }

  const deviceId = `${Date.now()}`;
  const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);

  await setDoc(deviceRef, {
    ...deviceInfo,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return deviceId;
}

export async function getUserDevices(user: User): Promise<DeviceInfo[]> {
  if (!user) return [];

  const devicesRef = collection(db, 'users', user.uid, 'devices');
  const snapshot = await getDocs(devicesRef);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as DeviceInfo));
}

export async function removeDevice(user: User, deviceId: string) {
  if (!user) throw new Error('User not authenticated');

  const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);
  const deviceDoc = await getDoc(deviceRef);

  if (!deviceDoc.exists()) {
    throw new Error('Device not found');
  }

  await deleteDoc(deviceRef);
}

export async function updateDeviceActivity(user: User, deviceId: string) {
  if (!user) return;

  const deviceRef = doc(db, 'users', user.uid, 'devices', deviceId);
  await updateDoc(deviceRef, {
    lastActive: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
} 