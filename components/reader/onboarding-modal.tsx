"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  useEffect(() => {
    if (!open) return;
    // Mark onboarding as seen in localStorage
    localStorage.setItem("vault-onboarding-seen", "true");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-vault-paper border-vault-brass/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-bold text-vault-mahogany">Welcome to the Vault</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm font-serif">
          <p>📜 <b>Navigate</b> the manuscript with arrow keys, tap the edges, or consult the Archive Index for chapters.</p>
          <p>✒️ <b>Illumination</b> and <b>Annotation</b> allow you to mark significant passages (archiving soon).</p>
          <p>🏺 <b>Aesthetics</b> can be adjusted in the settings (Aa) to suit your reading sanctuary.</p>
          <p>🕯️ <b>Your Resonance</b> is preserved across all devices, ensuring your place is never lost.</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose} autoFocus className="bg-vault-mahogany text-vault-sand hover:bg-vault-mahogany/90 font-bold uppercase tracking-widest text-[10px] py-6 px-8 rounded-xl">Commence Reading</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
