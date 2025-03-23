import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import {
  collection,
  doc,
  FirestoreError,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getUserRole } from "./admin";
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

export class SupportError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "SupportError";
  }
}

function handleFirestoreError(error: any): never {
  if (error instanceof FirestoreError) {
    switch (error.code) {
      case "permission-denied":
        throw new SupportError(
          "You do not have permission to perform this action",
          "PERMISSION_DENIED"
        );
      case "not-found":
        throw new SupportError(
          "The requested resource was not found",
          "NOT_FOUND"
        );
      case "unavailable":
        throw new SupportError(
          "The service is currently unavailable. Please try again later",
          "SERVICE_UNAVAILABLE"
        );
      case "already-exists":
        throw new SupportError(
          "A resource with this ID already exists",
          "ALREADY_EXISTS"
        );
      default:
        throw new SupportError("An unexpected error occurred", "UNKNOWN_ERROR");
    }
  }
  throw error;
}

export async function createSupportTicket(
  user: User,
  subject: string,
  description: string,
  category: string
): Promise<string> {
  if (!user)
    throw new SupportError("User not authenticated", "NOT_AUTHENTICATED");
  if (!subject.trim())
    throw new SupportError("Subject is required", "INVALID_INPUT");
  if (!description.trim())
    throw new SupportError("Description is required", "INVALID_INPUT");
  if (!category.trim())
    throw new SupportError("Category is required", "INVALID_INPUT");

  try {
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
      subject: subject.trim(),
      description: description.trim(),
      status: "open",
      priority,
      category: category.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(ticketRef, ticket);
    return ticketId;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function getUserTickets(user: User): Promise<SupportTicket[]> {
  if (!user)
    throw new SupportError("User not authenticated", "NOT_AUTHENTICATED");

  try {
    const ticketsRef = collection(db, "support_tickets");
    const q = query(
      ticketsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as SupportTicket)
    );
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function addTicketComment(
  user: User,
  ticketId: string,
  content: string
): Promise<string> {
  if (!user)
    throw new SupportError("User not authenticated", "NOT_AUTHENTICATED");
  if (!content.trim())
    throw new SupportError("Comment content is required", "INVALID_INPUT");

  try {
    const ticketRef = doc(db, "support_tickets", ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      throw new SupportError("Ticket not found", "NOT_FOUND");
    }

    const ticket = ticketDoc.data() as SupportTicket;
    if (ticket.status === "closed") {
      throw new SupportError(
        "Cannot add comments to a closed ticket",
        "TICKET_CLOSED"
      );
    }

    if (ticket.userId !== user.uid) {
      throw new SupportError(
        "Unauthorized to comment on this ticket",
        "UNAUTHORIZED"
      );
    }

    // Check if user is super admin
    const userRole = await getUserRole(user);
    const isStaff = userRole === "superAdmin";

    const commentId = `comment_${Date.now()}`;
    const commentRef = doc(db, "ticket_comments", commentId);

    const comment: TicketComment = {
      id: commentId,
      ticketId,
      userId: user.uid,
      userEmail: user.email!,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      isStaff,
    };

    await setDoc(commentRef, comment);
    await updateDoc(ticketRef, {
      updatedAt: new Date().toISOString(),
    });

    return commentId;
  } catch (error) {
    handleFirestoreError(error);
  }
}

export async function getTicketComments(
  user: User,
  ticketId: string
): Promise<TicketComment[]> {
  if (!user)
    throw new SupportError("User not authenticated", "NOT_AUTHENTICATED");

  try {
    const ticketRef = doc(db, "support_tickets", ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      throw new SupportError("Ticket not found", "NOT_FOUND");
    }

    const ticket = ticketDoc.data() as SupportTicket;
    if (ticket.userId !== user.uid) {
      throw new SupportError(
        "Unauthorized to view ticket comments",
        "UNAUTHORIZED"
      );
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
  } catch (error) {
    console.log(error);

    handleFirestoreError(error);
  }
}

export async function updateTicketStatus(
  user: User,
  ticketId: string,
  status: SupportTicket["status"]
): Promise<void> {
  if (!user)
    throw new SupportError("User not authenticated", "NOT_AUTHENTICATED");
  if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
    throw new SupportError("Invalid ticket status", "INVALID_STATUS");
  }

  try {
    const ticketRef = doc(db, "support_tickets", ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      throw new SupportError("Ticket not found", "NOT_FOUND");
    }

    const ticket = ticketDoc.data() as SupportTicket;
    if (ticket.userId !== user.uid) {
      throw new SupportError(
        "Unauthorized to update ticket status",
        "UNAUTHORIZED"
      );
    }

    await updateDoc(ticketRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error);
  }
}
