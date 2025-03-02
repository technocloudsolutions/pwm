import { db } from './firebase';
import { doc, collection, addDoc, getDoc, getDocs, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { hasFeature, BooleanFeatures } from './subscription';
import { User } from 'firebase/auth';
import { logActivity } from './activity-logs';
import { TeamMember } from './team';

export interface SharedPassword {
  id: string;
  passwordId: string;
  sharedBy: string;
  sharedWith: string;
  teamId?: string | null;
  permissions: 'read' | 'write';
  sharedAt: string;
  expiresAt?: string;
  createdAt: string;
}

export interface SharedPasswordWithDetails extends SharedPassword {
  sharedWithEmail: string;
}

export const sharePassword = async (
  userId: string,
  passwordId: string,
  recipientEmail: string,
  options: {
    permissions?: 'read' | 'write';
    expiresAt?: Date;
    teamId?: string;
  } = {}
): Promise<SharedPassword> => {
  // Check if user has sharing feature
  const userObj = { uid: userId } as User;
  const canShare = await hasFeature(userObj, options.teamId ? 'hasTeamFeatures' : 'canSharePasswords' as BooleanFeatures);
  if (!canShare) {
    throw new Error('Upgrade your plan to share passwords');
  }

  // Get recipient user
  const recipientQuery = query(collection(db, 'users'), where('email', '==', recipientEmail));
  const recipientDocs = await getDocs(recipientQuery);
  if (recipientDocs.empty) {
    throw new Error('Recipient not found');
  }
  const recipientId = recipientDocs.docs[0].id;

  // Check if password exists and belongs to user
  const passwordDoc = await getDoc(doc(db, 'passwords', passwordId));
  if (!passwordDoc.exists()) {
    throw new Error('Password not found');
  }
  const passwordData = passwordDoc.data();
  if (passwordData.userId !== userId && !passwordData.teamId) {
    throw new Error('Not authorized to share this password');
  }

  // If it's a team password, verify user is team admin
  if (options.teamId) {
    const teamDoc = await getDoc(doc(db, 'teams', options.teamId));
    if (!teamDoc.exists()) {
      throw new Error('Team not found');
    }
    const team = teamDoc.data();
    const isAdmin = team.members.find((m: TeamMember) => m.id === userId && m.role === 'admin');
    if (!isAdmin) {
      throw new Error('Only team admins can share team passwords');
    }
  }

  const shareData: Omit<SharedPassword, 'id'> = {
    passwordId,
    sharedBy: userId,
    sharedWith: recipientId,
    teamId: options.teamId || null,
    permissions: options.permissions || 'read',
    sharedAt: new Date().toISOString(),
    expiresAt: options.expiresAt?.toISOString(),
    createdAt: new Date().toISOString()
  };

  const shareRef = await addDoc(collection(db, 'shared_passwords'), shareData);

  // Log the sharing activity
  await logActivity(userId, 'password_share', {
    passwordId,
    recipientId,
    permissions: options.permissions,
    teamId: options.teamId || null,
  });

  return {
    id: shareRef.id,
    ...shareData
  };
};

export const getSharedPasswords = async (userId: string): Promise<SharedPassword[]> => {
  try{
    // Get passwords shared with the user
  const sharedQuery = query(
    collection(db, 'shared_passwords'),
    where('sharedWith', '==', userId)
  );
  
  const now = new Date().toISOString();
  const shareDocs = await getDocs(sharedQuery);
  
  return shareDocs.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SharedPassword))
    .filter(share => !share.expiresAt || share.expiresAt > now);
  } catch (error: any) {
    console.error('Error getting shared passwords:', error);
    return [];
  }
};

export const getPasswordShares = async (userId: string): Promise<SharedPasswordWithDetails[]> => {
  const sharesQuery = query(
    collection(db, "shared_passwords"),
    where("sharedBy", "==", userId)
  );

  const shareDocs = await getDocs(sharesQuery);

  const sharedPasswords = await Promise.all(
    shareDocs.docs.map(async (docSnap) => {
      const data = docSnap.data();

      // Fetch sharedWith user email
      let sharedWithEmail = "";
      if (data.sharedWith) {
        const userDoc = await getDoc(doc(db, "users", data.sharedWith));
        sharedWithEmail = userDoc.exists() ? userDoc.data().email : "Unknown";
      }

      return {
        id: docSnap.id,
        passwordId: data.passwordId,
        sharedWith: data.sharedWith,
        sharedWithEmail,
        permissions: data.permissions,
        expiresAt: data.expiresAt,
        sharedAt: data.sharedAt,
      } as SharedPasswordWithDetails;
    })
  );

  return sharedPasswords;
};

export const updatePasswordShare = async (
  userId: string,
  shareId: string,
  updates: {
    permissions?: 'read' | 'write';
    expiresAt?: Date | null;
  }
): Promise<void> => {
  const shareDoc = await getDoc(doc(db, 'shared_passwords', shareId));
  if (!shareDoc.exists()) {
    throw new Error('Share not found');
  }

  const share = shareDoc.data() as SharedPassword;
  if (share.sharedBy !== userId) {
    throw new Error('Not authorized to modify this share');
  }

  const updateData: Partial<SharedPassword> = {};
  if (updates.permissions) {
    updateData.permissions = updates.permissions;
  }
  if ('expiresAt' in updates) {
    updateData.expiresAt = updates.expiresAt?.toISOString();
  }

  await updateDoc(doc(db, 'shared_passwords', shareId), updateData);
};

export const revokePasswordShare = async (userId: string, shareId: string): Promise<void> => {
  const shareDoc = await getDoc(doc(db, 'shared_passwords', shareId));
  if (!shareDoc.exists()) {
    throw new Error('Share not found');
  }

  const share = shareDoc.data() as SharedPassword;
  if (share.sharedBy !== userId) {
    throw new Error('Not authorized to revoke this share');
  }

  await deleteDoc(doc(db, 'shared_passwords', shareId));

  // Log the revoke activity
  await logActivity(userId, 'password_share', {
    action: 'revoke',
    passwordId: share.passwordId,
    recipientId: share.sharedWith,
    teamId: share.teamId
  });
}; 