import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    console.log('Received init admin request');
    
    const { userId, email } = await request.json();
    console.log('User ID:', userId, 'Email:', email);

    if (!userId || !email) {
      console.error('Missing required fields');
      return NextResponse.json({ error: 'User ID and email are required' }, { status: 400 });
    }

    // Check if user document exists
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    // Check if any admin exists
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef);
    const userDocs = await getDocs(usersQuery);
    const hasAdmin = userDocs.docs.some(doc => doc.data().role === 'admin');

    if (hasAdmin && (!userDoc.exists() || userDoc.data()?.role !== 'admin')) {
      console.error('Cannot initialize admin: Admin already exists');
      return NextResponse.json(
        { error: 'Cannot initialize admin: Admin already exists' },
        { status: 403 }
      );
    }

    const userData = {
      email,
      role: 'admin',
      subscription: 'business',
      subscriptionUpdatedAt: new Date().toISOString(),
      createdAt: userDoc.exists() ? userDoc.data().createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Create or update the user document
      await setDoc(userRef, userData, { merge: true });
      console.log('Admin user initialized successfully with Business plan');
    } catch (error: any) {
      console.error('Error initializing admin user:', error);
      return NextResponse.json(
        { error: `Failed to initialize admin user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in init admin API:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to initialize admin',
        details: error.stack
      },
      { status: 500 }
    );
  }
} 