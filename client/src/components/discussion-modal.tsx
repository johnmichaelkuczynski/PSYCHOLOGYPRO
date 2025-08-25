import { useState, useEffect } from "react";
import { X, Send, User, Bot, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Discussion } from "@shared/schema";

interface DiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisId: string | null;
}

export default function DiscussionModal({ isOpen, onClose, analysisId }: DiscussionModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: discussions = [], isLoading } = useQuery<Discussion[]>({
    queryKey: ["/api/discussions", analysisId],
    enabled: !!analysisId && isOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, sender }: { message: string; sender: "user" | "system" }) => {
      const response = await apiRequest("POST", "/api/discussions", {
        analysisId,
        message,
        sender,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", analysisId] });
      setMessage("");
    },
  });

  const contestAnalysisMutation = useMutation({
    mutationFn: async (contestMessage: string) => {
      const response = await apiRequest("POST", `/api/analyses/${analysisId}/contest`, {
        contestMessage,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis contested",
        description: "A new analysis has been started based on your feedback.",
      });
      onClose();
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim() || !analysisId) return;
    
    setIsSubmitting(true);
    try {
      // Send user message
      await sendMessageMutation.mutateAsync({
        message: message.trim(),
        sender: "user",
      });

      // Simulate AI response (in real implementation, this would be handled by the backend)
      setTimeout(async () => {
        await sendMessageMutation.mutateAsync({
          message: "I understand your perspective on this analysis. Could you elaborate on which specific aspects you'd like me to reconsider?",
          sender: "system",
        });
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Could not send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContestAnalysis = async () => {
    if (!message.trim() || !analysisId) return;

    setIsSubmitting(true);
    try {
      await contestAnalysisMutation.mutateAsync(message.trim());
    } catch (error) {
      toast({
        title: "Failed to contest analysis",
        description: "Could not start a new analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hour${Math.floor(diffMinutes / 60) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (!analysisId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="discussion-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Discuss Analysis Results
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="close-discussion">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Discussion Thread */}
          <ScrollArea className="h-64 border rounded-md p-4" data-testid="discussion-thread">
            {isLoading ? (
              <div className="text-center text-gray-500">Loading discussion...</div>
            ) : discussions.length === 0 ? (
              <div className="text-center text-gray-500">
                No discussion yet. Start by sharing your thoughts about the analysis.
              </div>
            ) : (
              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <div key={discussion.id} className="flex space-x-3" data-testid={`message-${discussion.id}`}>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>
                        {discussion.sender === "user" ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {discussion.sender === "user" ? "You" : "Mind Reader"}
                        </span>
                        <span className="text-gray-500">
                          {formatTimestamp(discussion.createdAt!.toString())}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        {discussion.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Discussion Input */}
          <div>
            <label htmlFor="discussion-input" className="block text-sm font-medium text-gray-700 mb-2">
              Share your thoughts on this analysis
            </label>
            <Textarea
              id="discussion-input"
              rows={4}
              placeholder="Discuss specific aspects of the analysis, contest results, or ask questions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="discussion-input"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} data-testid="close-modal-button">
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleContestAnalysis}
              disabled={!message.trim() || isSubmitting}
              data-testid="contest-analysis-button"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Contest & Reanalyze
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSubmitting}
              data-testid="send-message-button"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
