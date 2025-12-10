"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SelfQRcodeWrapper, SelfAppBuilder } from "@selfxyz/qrcode";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/web3/config";
import { SECUREFLOW_ABI } from "@/lib/web3/abis";

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
  const [verificationAvailable, setVerificationAvailable] = useState<boolean | null>(null); // null = unknown, true/false = checked

  // Initialize Self App on mount
  useEffect(() => {
    if (typeof window === "undefined") {
      return; // Skip on server-side
    }

    // Skip Self Protocol initialization on localhost (not supported)
    const isLocalhost = window.location.hostname === "localhost" || 
                       window.location.hostname === "127.0.0.1" ||
                       window.location.hostname === "";
    
    if (isLocalhost) {
      console.warn("Self Protocol is disabled on localhost. It will work in production.");
      return;
    }

    // Only initialize if wallet is connected with a valid address
    // Self Protocol requires a valid address (not zero address) or UUID
    if (!wallet.isConnected || !wallet.address) {
      // Don't initialize until wallet is connected
      setSelfApp(null);
      return;
    }

    // Validate address format
    if (!ethers.isAddress(wallet.address) || wallet.address === ethers.ZeroAddress) {
      console.warn("Invalid wallet address for Self Protocol:", wallet.address);
      setSelfApp(null);
      return;
    }

    try {
      // According to Self Protocol docs: https://docs.self.xyz/frontend-integration/qrcode-sdk-api-reference
      // Required fields: appName, logoBase64, endpointType, endpoint, scope, userId, userIdType, disclosures
      const app = new SelfAppBuilder({
        appName: "SecureFlow",
        logoBase64: `${window.location.origin}/secureflow-logo.svg`, // Logo URL (can be URL or base64)
        endpointType: 'https', // 'https' for backend verification, 'celo' for on-chain
        endpoint: `${window.location.origin}/api/self/verify`, // Backend API endpoint
        scope: "secureflow-identity", // Unique scope for your app
        userId: wallet.address.toLowerCase(), // Use connected wallet address (lowercase for consistency)
        userIdType: 'hex', // Address is hex format
        version: 2,
        disclosures: {
          // Request minimum age verification (18+) - ensures user is a real person
          minimumAge: 18,
          // You can add more disclosures as needed:
          // issuing_state: false,
          // name: false,
          // date_of_birth: false,
          // nationality: false,
        },
      }).build();
      
      setSelfApp(app);
    } catch (error: any) {
      console.error("Failed to initialize Self App:", error);
      setSelfApp(null);
      // Don't show error to user if it's just a missing wallet
      if (error.message && !error.message.includes("userId")) {
        console.error("Self Protocol initialization error details:", error);
      }
    }
  }, [wallet.address, wallet.isConnected]);

  // Check verification status from contract
  const checkVerificationStatus = async () => {
    if (!wallet.isConnected || !wallet.address) {
      setIsVerified(false);
      return;
    }

    // If we've already determined verification is not available, skip
    if (verificationAvailable === false) {
      return;
    }

    // Check localStorage first for quick access
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(`self_verified_${wallet.address.toLowerCase()}`);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setIsVerified(cachedData.verified);
          setVerificationTimestamp(cachedData.timestamp);
          // If we have cached data, we can skip the contract call
          return;
        } catch (e) {
          // Invalid cache, continue to contract check
        }
      }
    }

    // Try to check from contract, but fail silently if not available
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);

      // Try to call the function, but catch errors silently
      try {
        const verified = await contract.call("selfVerifiedUsers", wallet.address);
        const timestamp = await contract.call("verificationTimestamp", wallet.address);

        setIsVerified(Boolean(verified));
        setVerificationTimestamp(timestamp ? Number(timestamp) : null);
        setVerificationAvailable(true); // Mark as available

        // Cache the result
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `self_verified_${wallet.address.toLowerCase()}`,
            JSON.stringify({
              verified: Boolean(verified),
              timestamp: timestamp ? Number(timestamp) : null,
            })
          );
        }
      } catch (callError: any) {
        // Function doesn't exist or contract doesn't support it
        // Mark as unavailable and stop trying
        setVerificationAvailable(false);
        setIsVerified(false);
        setVerificationTimestamp(null);
      }
    } catch (error: any) {
      // Contract call failed entirely - verification not available
      // Mark as unavailable and stop trying
      setVerificationAvailable(false);
      setIsVerified(false);
      setVerificationTimestamp(null);
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
    // Check if we're on localhost
    const isLocalhost = typeof window !== "undefined" && 
      (window.location.hostname === "localhost" || 
       window.location.hostname === "127.0.0.1" ||
       window.location.hostname === "");

    if (isLocalhost) {
      return (
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p className="mb-2">Self Protocol verification is not available on localhost.</p>
          <p>Please deploy to a production environment to use identity verification.</p>
        </div>
      );
    }

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

