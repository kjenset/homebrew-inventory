import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Rocket, PlayCircle, BookOpen, Loader2 } from "lucide-react";

export default function WelcomeDialog({ isOpen, onStartFresh, onLoadExamples }) {
  const [isStartingFresh, setIsStartingFresh] = useState(false);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);

  const handleStartFresh = async () => {
    setIsStartingFresh(true);
    await onStartFresh();
  };

  const handleLoadExamples = async () => {
    setIsLoadingExamples(true);
    await onLoadExamples();
    // The parent component will handle closing the dialog on success
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-2xl text-center font-bold">Welcome to Your Brewery!</DialogTitle>
          <DialogDescription className="text-center pt-2">
            Let's get you set up. Choose an option below to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            onClick={handleStartFresh}
            disabled={isStartingFresh || isLoadingExamples}
            className="w-full h-20 text-lg flex justify-start items-center gap-4"
          >
            {isStartingFresh ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Rocket className="w-6 h-6" />
            )}
            <div>
              <p className="font-semibold text-left">Start From Scratch</p>
              <p className="font-normal text-sm text-left">Go to settings to configure your app.</p>
            </div>
          </Button>

          <Button
            onClick={handleLoadExamples}
            disabled={isStartingFresh || isLoadingExamples}
            className="w-full h-20 text-lg flex justify-start items-center gap-4"
            variant="secondary"
          >
            {isLoadingExamples ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <PlayCircle className="w-6 h-6" />
            )}
            <div>
              <p className="font-semibold text-left">Try with Example Data</p>
              <p className="font-normal text-sm text-left">Explore the app with pre-filled content.</p>
            </div>
          </Button>
        </div>

        <div className="text-center">
            <Link to={createPageUrl("Documentation")} className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Read the Documentation
            </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}