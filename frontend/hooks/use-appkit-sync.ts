"use client";

import { useEffect, useRef } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useWeb3 } from "@/contexts/web3-context";

export function useAppKitSync() {
  const { open, address, isConnected, chainId } = useAppKit();
  const { wallet } = useWeb3();
  const prevConnectedRef = useRef(false);

  // Sync AppKit connection state with Web3 context
  useEffect(() => {
    // If AppKit just connected and Web3 context doesn't know about it
    if (isConnected && address && !wallet.isConnected) {
      // Force a connection check by requesting accounts
      // This will trigger the Web3 context to update
      if (typeof window !== "undefined") {
        // Try multiple ways to get the provider
        const provider =
          window.ethereum || (window as any).ethereum?.providers?.[0];
        if (provider) {
          provider.request({ method: "eth_requestAccounts" }).catch(() => {
            // Ignore errors - connection check will handle it
          });
        }
      }
    }

    // If AppKit disconnected and Web3 context still thinks we're connected
    if (!isConnected && wallet.isConnected) {
      // The Web3 context polling will catch this, but we can trigger it faster
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.request({ method: "eth_accounts" }).catch(() => {
          // Ignore errors
        });
      }
    }

    prevConnectedRef.current = isConnected;
  }, [isConnected, address, chainId, wallet.isConnected]);

  return { open, address, isConnected };
}
