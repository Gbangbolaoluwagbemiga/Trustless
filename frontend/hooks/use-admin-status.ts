import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";
import { SECUREFLOW_ABI } from "@/lib/web3/abis";

export function useAdminStatus() {
  const { wallet, getContract } = useWeb3();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isArbiter, setIsArbiter] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      setIsAdmin(false);
      setIsOwner(false);
      setIsArbiter(false);
      return;
    }

    checkAdminStatus();
  }, [wallet.isConnected, wallet.address]);

  const checkAdminStatus = async () => {
    setLoading(true);
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);
      if (!contract) {
        setIsAdmin(false);
        setIsOwner(false);
        setIsArbiter(false);
        return;
      }

      // Get the contract owner
      const owner = await contract.call("owner");

      // Check if current wallet is the owner
      const ownerCheck =
        owner.toString().toLowerCase() === wallet.address?.toLowerCase();
      setIsOwner(ownerCheck);

      // Check if current wallet is an authorized arbiter
      const arbiterCheck = await contract.call(
        "authorizedArbiters",
        wallet.address
      );
      setIsArbiter(Boolean(arbiterCheck));

      // Admin access is granted to both owner and arbiters
      setIsAdmin(ownerCheck || Boolean(arbiterCheck));
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
      setIsOwner(false);
      setIsArbiter(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isAdmin,
    isOwner,
    isArbiter,
    loading,
    refreshAdminStatus: checkAdminStatus,
  };
}
