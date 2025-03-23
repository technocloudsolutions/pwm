import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  SupportTicket,
  TicketComment,
  addTicketComment,
  createSupportTicket,
  getTicketComments,
  getUserTickets,
  updateTicketStatus,
} from "@/lib/support";
import { MessageSquare, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";

export function SupportTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    category: "general",
  });
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadTickets();
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      loadComments(selectedTicket.id);
    }
  }, [selectedTicket]);

  const loadTickets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userTickets = await getUserTickets(user);
      setTickets(userTickets);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load tickets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (ticketId: string) => {
    if (!user) return;

    try {
      setTicketComments([]);
      const comments = await getTicketComments(user, ticketId);
      setTicketComments(comments);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load comments",
        variant: "destructive",
      });
    }
  };

  const handleCreateTicket = async () => {
    if (!user || !newTicket.subject.trim() || !newTicket.description.trim())
      return;

    try {
      await createSupportTicket(
        user,
        newTicket.subject.trim(),
        newTicket.description.trim(),
        newTicket.category
      );
      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });
      setNewTicket({ subject: "", description: "", category: "general" });
      setShowNewTicket(false);
      loadTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!user || !selectedTicket || !newComment.trim()) return;

    try {
      await addTicketComment(user, selectedTicket.id, newComment.trim());
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
      setNewComment("");
      loadComments(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (
    ticketId: string,
    status: SupportTicket["status"]
  ) => {
    if (!user) return;

    try {
      await updateTicketStatus(user, ticketId, status);
      toast({
        title: "Success",
        description: "Ticket status updated successfully",
      });
      loadTickets();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-gray-100 text-gray-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <div className="flex gap-2">
            <Button onClick={loadTickets} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button onClick={() => setShowNewTicket(true)} size="sm">
              <MessageSquare className="h-4 w-4 mr-1" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Create New Ticket Form */}
        {showNewTicket && (
          <Card className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Create New Support Ticket</h3>
            <div className="space-y-4">
              <Input
                placeholder="Subject"
                value={newTicket.subject}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, subject: e.target.value })
                }
              />
              <Textarea
                placeholder="Description"
                value={newTicket.description}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, description: e.target.value })
                }
                rows={4}
              />
              <select
                className="w-full border rounded-md p-2"
                value={newTicket.category}
                onChange={(e) =>
                  setNewTicket({ ...newTicket, category: e.target.value })
                }
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="feature">Feature Request</option>
              </select>
              <div className="flex gap-2">
                <Button onClick={handleCreateTicket}>Create Ticket</Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewTicket(false);
                    setNewTicket({
                      subject: "",
                      description: "",
                      category: "general",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No support tickets yet
          </p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ticket.category} • Created{" "}
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                        ticket.status
                      )}`}
                    >
                      {ticket.status.replace("_", " ").toUpperCase()}
                    </span>
                    <span
                      className={`text-sm font-medium ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                </div>

                <p className="text-sm whitespace-pre-wrap">
                  {ticket.description}
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSelectedTicket(
                        ticket === selectedTicket ? null : ticket
                      )
                    }
                  >
                    {ticket === selectedTicket
                      ? "Hide Comments"
                      : "Show Comments"}
                  </Button>
                  {ticket.status !== "closed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(ticket.id, "closed")}
                    >
                      Close Ticket
                    </Button>
                  )}
                </div>

                {/* Comments Section */}
                {ticket === selectedTicket && (
                  <div className="space-y-4 mt-4">
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Comments</h4>
                      <div className="space-y-4">
                        {ticketComments.map((comment) => (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg ${
                              comment.isStaff ? "staff-comment" : "user-comment"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-medium">
                                {comment.userEmail}
                                {comment.isStaff && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    Staff
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add Comment Form */}
                    {ticket.status !== "closed" && (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button onClick={handleAddComment}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
