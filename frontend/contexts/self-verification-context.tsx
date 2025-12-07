"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/web3/config";

interface SelfVerificationContextType {
  isVerified: boolean;
  isVerifying: boolean;
  verificationTimestamp: number | null;
  verifyIdentity: () => Promise<void>;
  checkVerificationStatus: () => Promise<void>;
  SelfVerificationComponent: React.ComponentType;
}

const SelfVerificationContext = createContext<SelfVerificationContextType | undefined>(
  undefined
);

export function SelfVerificationProvider({ children }: { children: ReactNode }) {
  const { wallet, getContract } = useWeb3();
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationTimestamp, setVerificationTimestamp] = useState<number | null>(null);
  const [selfApp, setSelfApp] = useState<any>(null);

  // Initialize Self App on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const app = new SelfAppBuilder({
          appName: "SecureFlow",
          scope: "secureflow-identity", // Unique scope for your app
          endpoint: typeof window !== "undefined" 
            ? `${window.location.origin}/api/self/verify` 
            : "https://your-domain.com/api/self/verify",
          userId: wallet.address || ethers.ZeroAddress,
          version: 2,
          disclosures: {
            // Request humanity verification (unique human check)
            humanity: true,
            // You can add more disclosures as needed
          },
        }).build();
        
        setSelfApp(app);
      } catch (error) {
        console.error("Failed to initialize Self App:", error);
      }
    }
  }, [wallet.address]);

  // Check verification status from contract
  const checkVerificationStatus = async () => {
    if (!wallet.isConnected || !wallet.address) {
      setIsVerified(false);
      return;
    }

    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, [
        "function selfVerifiedUsers(address) view returns (bool)",
        "function verificationTimestamp(address) view returns (uint256)",
      ]);

      const verified = await contract.call("selfVerifiedUsers", wallet.address);
      const timestamp = await contract.call("verificationTimestamp", wallet.address);

      setIsVerified(Boolean(verified));
      setVerificationTimestamp(timestamp ? Number(timestamp) : null);

      // Also check localStorage for quick access
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`self_verified_${wallet.address.toLowerCase()}`);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setIsVerified(cachedData.verified);
          setVerificationTimestamp(cachedData.timestamp);
        }
      }
    } catch (error) {
      console.error("Failed to check verification status:", error);
      setIsVerified(false);
    }
  };

  // Verify identity using Self Protocol
  const verifyIdentity = async () => {
    if (!wallet.isConnected || !wallet.address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!selfApp) {
      toast({
        title: "Initialization error",
        description: "Self Protocol not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // The QR code component will handle the verification flow
      // After user scans and completes verification, the backend will call the contract
      // We'll poll for verification status
      toast({
        title: "Verification started",
        description: "Scan the QR code with the Self app to verify your identity",
      });

      // Poll for verification status every 2 seconds for up to 5 minutes
      const maxAttempts = 150; // 5 minutes / 2 seconds
      let attempts = 0;

      const pollInterval = setInterval(async () => {
        attempts++;
        await checkVerificationStatus();

        if (isVerified || attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsVerifying(false);

          if (isVerified) {
            toast({
              title: "Verification successful",
              description: "Your identity has been verified!",
            });
          } else if (attempts >= maxAttempts) {
            toast({
              title: "Verification timeout",
              description: "Verification timed out. Please try again.",
              variant: "destructive",
            });
          }
        }
      }, 2000);

      // Cleanup on unmount
      return () => clearInterval(pollInterval);
    } catch (error: any) {
      console.error("Verification error:", error);
      setIsVerifying(false);
      toast({
        title: "Verification failed",
        description: error.message || "Failed to start verification",
        variant: "destructive",
      });
    }
  };

  // Check verification status when wallet connects
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      checkVerificationStatus();
    } else {
      setIsVerified(false);
      setVerificationTimestamp(null);
    }
  }, [wallet.isConnected, wallet.address]);

  // Self Verification Component (QR Code Wrapper)
  const SelfVerificationComponent = () => {
    if (!selfApp) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Initializing verification...
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <SelfQRcodeWrapper selfApp={selfApp} />
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Scan this QR code with the Self mobile app to verify your identity.
          This helps prevent fraud and ensures a trusted platform.
        </p>
      </div>
    );
  };

  return (
    <SelfVerificationContext.Provider
      value={{
        isVerified,
        isVerifying,
        verificationTimestamp,
        verifyIdentity,
        checkVerificationStatus,
        SelfVerificationComponent,
      }}
    >
      {children}
    </SelfVerificationContext.Provider>
  );
}

export function useSelfVerification() {
  const context = useContext(SelfVerificationContext);
  if (context === undefined) {
    throw new Error("useSelfVerification must be used within a SelfVerificationProvider");
  }
  return context;
}

