import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getUserSubscription } from "./subscription";

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolution?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userEmail: string;
  content: string;
  createdAt: string;
  isStaff: boolean;
}

export async function createSupportTicket(
  user: User,
  subject: string,
  description: string,
  category: string
): Promise<string> {
  if (!user) throw new Error("User not authenticated");

  const subscription = await getUserSubscription(user);
  const priority =
    subscription === "business"
      ? "high"
      : subscription === "premium"
      ? "medium"
      : "low";

  const ticketId = `ticket_${Date.now()}`;
  const ticketRef = doc(db, "support_tickets", ticketId);

  const ticket: Omit<SupportTicket, "id"> = {
    userId: user.uid,
    userEmail: user.email!,
    subject,
    description,
    status: "open",
    priority,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ticketRef, ticket);
  return ticketId;
}

export async function getUserTickets(user: User): Promise<SupportTicket[]> {
  if (!user) return [];

  const ticketsRef = collection(db, "support_tickets");
  const q = query(
    ticketsRef,
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  try {
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as SupportTicket)
    );
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return [];
  }
}

export async function addTicketComment(
  user: User,
  ticketId: string,
  content: string
): Promise<string> {
  if (!user) throw new Error("User not authenticated");

  const ticketRef = doc(db, "support_tickets", ticketId);
  const ticketDoc = await getDoc(ticketRef);

  if (!ticketDoc.exists()) {
    throw new Error("Ticket not found");
  }

  const ticket = ticketDoc.data() as SupportTicket;
  if (ticket.userId !== user.uid) {
    throw new Error("Unauthorized to comment on this ticket");
  }

  const commentId = `comment_${Date.now()}`;
  const commentRef = doc(db, "ticket_comments", commentId);

  const comment: TicketComment = {
    id: commentId,
    ticketId,
    userId: user.uid,
    userEmail: user.email!,
    content,
    createdAt: new Date().toISOString(),
    isStaff: false,
  };

  await setDoc(commentRef, comment);
  await updateDoc(ticketRef, {
    updatedAt: new Date().toISOString(),
  });

  return commentId;
}

export async function getTicketComments(
  user: User,
  ticketId: string
): Promise<TicketComment[]> {
  if (!user) return [];

  const ticketRef = doc(db, "support_tickets", ticketId);
  const ticketDoc = await getDoc(ticketRef);

  if (!ticketDoc.exists()) {
    throw new Error("Ticket not found");
  }

  const ticket = ticketDoc.data() as SupportTicket;
  if (ticket.userId !== user.uid) {
    throw new Error("Unauthorized to view ticket comments");
  }

  const commentsRef = collection(db, "ticket_comments");
  const q = query(
    commentsRef,
    where("ticketId", "==", ticketId),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      } as TicketComment)
  );
}

export async function updateTicketStatus(
  user: User,
  ticketId: string,
  status: SupportTicket["status"]
): Promise<void> {
  if (!user) throw new Error("User not authenticated");

  const ticketRef = doc(db, "support_tickets", ticketId);
  const ticketDoc = await getDoc(ticketRef);

  if (!ticketDoc.exists()) {
    throw new Error("Ticket not found");
  }

  const ticket = ticketDoc.data() as SupportTicket;
  if (ticket.userId !== user.uid) {
    throw new Error("Unauthorized to update ticket status");
  }

  await updateDoc(ticketRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
}
