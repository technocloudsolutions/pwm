import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    console.log('Received promote request');
    
    const { userId } = await request.json();
    console.log('User ID to promote:', userId);

    if (!userId) {
      console.error('Missing user ID');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if any admin exists
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef);
    const userDocs = await getDocs(usersQuery);
    const hasAdmin = userDocs.docs.some(doc => doc.data().role === 'admin');

    // If no admin exists, allow the first user to become admin
    if (!hasAdmin) {
      try {
        await updateDoc(userRef, {
          role: 'admin',
          subscription: 'business',
          subscriptionUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log('First admin promoted successfully with Business plan');
        return NextResponse.json({ success: true });
      } catch (error: any) {
        console.error('Error promoting first admin:', error);
        return NextResponse.json(
          { error: `Failed to promote first admin: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // If admin exists, check if current user is admin
    const currentUserData = userDoc.data();
    if (currentUserData.role !== 'admin') {
      console.error('User is not an admin');
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can promote users' },
        { status: 403 }
      );
    }

    // Update user document
    try {
      await updateDoc(userRef, {
        role: 'admin',
        subscription: 'business',
        subscriptionUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('User promoted to admin successfully with Business plan');
    } catch (error: any) {
      console.error('Error promoting user:', error);
      return NextResponse.json(
        { error: `Failed to promote user: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in promote API:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to promote user',
        details: error.stack
      },
      { status: 500 }
    );
  }
} 