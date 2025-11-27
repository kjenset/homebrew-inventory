import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { SendEmail } from "@/integrations/Core";

export default function FeedbackDialog({ isOpen, onClose }) {
  const [feedback, setFeedback] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      alert("Please enter your feedback.");
      return;
    }
    if (!fromEmail.trim()) {
      alert("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const subject = "Homebrew inventory - New Feedback";
      const body = `
        <p>A user has submitted new feedback for the Homebrew Inventory app.</p>
        <hr>
        <p><strong>Feedback:</strong></p>
        <p style="white-space: pre-wrap; background-color: #f9f9f9; padding: 10px; border-radius: 5px;">${feedback}</p>
        <hr>
        <p><strong>Reply to:</strong> ${fromEmail}</p>
      `;

      await SendEmail({
        to: "kjenset@gmail.com",
        subject: subject,
        body: body,
      });

      setSubmitStatus("success");
      setFeedback("");
      setFromEmail("");
    } catch (error) {
      console.error("Error sending feedback:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
      onClose();
      setTimeout(() => {
          setSubmitStatus(null);
          setFeedback("");
          setFromEmail("");
      }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Have a suggestion or found a bug? Let us know! Your feedback helps improve the app.
          </DialogDescription>
        </DialogHeader>
        
        {submitStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-xl font-bold text-[--primary-text]">Thank You!</h3>
                <p className="text-[--secondary-text] mt-2">Your feedback has been sent successfully.</p>
                 <Button onClick={handleClose} className="mt-6" style={{ backgroundColor: 'var(--button-bg)' }}>Close</Button>
            </div>
        ) : (
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="from-email">Your Email *</Label>
                    <Input
                        id="from-email"
                        type="email"
                        value={fromEmail}
                        onChange={(e) => setFromEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="feedback-message">Feedback *</Label>
                    <Textarea
                        id="feedback-message"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us what you think..."
                        required
                        rows={5}
                    />
                </div>
                 {submitStatus === 'error' && (
                    <p className="text-sm text-red-600">
                        Sorry, something went wrong. Please try again later.
                    </p>
                )}
                
                <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-4">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        disabled={isSubmitting} 
                        className="bg-gray-700 hover:bg-gray-800 text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Feedback
                            </>
                        )}
                    </Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}