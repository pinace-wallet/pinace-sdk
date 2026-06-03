# Example: Node script

End-to-end Pinace lifecycle in a single Node script — smoke test for SDK changes + reference for integrators.

## Run

```bash
# Required: sui keytool format secret keys
export OWNER_SECRET_KEY=suiprivkey1...
export AGENT_SECRET_KEY=suiprivkey1...

# Optional overrides
export PINACE_PACKAGE_ID=0x...     # defaults to PACKAGE_IDS.testnet
export SUI_NETWORK=testnet         # mainnet | testnet | devnet
export SUI_RPC_URL=https://...     # custom fullnode

pnpm start
```

Owner needs ~0.5 SUI from [testnet faucet](https://faucet.sui.io/?network=testnet). Script tops up agent with 0.05 SUI for gas.

## Flow covered

1. Create BalancePool
2. Deposit SUI
3. Connect agent + attach spending-limit + token-whitelist policies
4. Agent: propose + prove(2 policies) + settle (atomic PTB)
5. Owner: revoke agent
6. Verify post-revoke action reverts with `MoveAbort code 5` (`delegation::assert_active`)
