/**
 * Turns a raw ethers.js contract-call error into a message that's actually
 * actionable, instead of dumping the raw ethers exception into the UI.
 *
 * Specifically recognizes the "missing revert data" / empty-data
 * CALL_EXCEPTION pattern (err.code === "CALL_EXCEPTION" with no
 * err.reason and no err.data) — this happens when the target contract's
 * `require`/`revert` call unwinds with *no* reason string at all. Common
 * real-world causes for a plain NFT `transferFrom`-style call reverting
 * with zero revert data:
 *
 *  - The NFT contract is an ERC-404 / DN404-style hybrid (mirrored
 *    ERC-20 + ERC-721 token, matching this collection's "404 Origin"
 *    branding). These tokens require the *recipient* contract to
 *    explicitly opt in to holding NFTs (commonly a `skipNFT` flag that
 *    defaults to "on" for any new contract). If the Staking or Burn Lab
 *    contract was deployed without that opt-in call, every incoming NFT
 *    transfer to it reverts with no reason — exactly this symptom, and
 *    on both contracts identically.
 *  - A transfer-restriction hook/hardcoded allowlist on the NFT contract
 *    itself (e.g. `transfersPaused`) blocking transfers to a contract
 *    address.
 *  - The staking/burn contract's own internal logic reverting via a raw
 *    `revert()`/`assert` with no message.
 *
 * None of these are fixable from the website's frontend code — they all
 * require an on-chain change from whoever owns/deployed the NFT contract
 * or the staking/burn contract. This helper's job is only to surface
 * that clearly instead of leaving the person staring at a raw ethers
 * stack trace, and to still show the real reason whenever the contract
 * *did* provide one.
 */
export function describeTxError(err: any, fallback: string): string {
  if (!err) return fallback;

  // Wallet-level rejection is handled separately by callers (err.code ===
  // "ACTION_REJECTED" / 4001) before this is ever called — this only
  // covers contract/network-level failures.

  // ethers v6 surfaces a decoded revert reason here when the contract
  // provided one (e.g. require(cond, "Not approved")).
  if (typeof err.reason === "string" && err.reason.length > 0) {
    return err.reason;
  }

  const message: string = typeof err.message === "string" ? err.message : "";
  const isEmptyRevert =
    err.code === "CALL_EXCEPTION" &&
    !err.reason &&
    (!err.data || err.data === "0x") &&
    /missing revert data/i.test(message);

  if (isEmptyRevert) {
    return (
      "The contract rejected this transaction with no error message " +
      "(empty revert). This is not a wallet or network problem — it " +
      "usually means the NFT contract is blocking this transfer at the " +
      "contract level (for example, an ERC-404/DN404-style token where " +
      "the receiving contract hasn't been opted in to hold NFTs, or a " +
      "transfer restriction on the NFT contract itself). This needs to " +
      "be fixed on-chain by the contract owner — please report this " +
      "token ID and the failing action."
    );
  }

  if (err.code === "INSUFFICIENT_FUNDS") {
    return "Wallet does not have enough funds to cover gas for this transaction.";
  }

  return message || fallback;
}
