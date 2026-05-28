# Example: Node script

End-to-end Pinace lifecycle in a single Node script — useful as a smoke test for SDK changes and as a reference for integrators.

## Run

```bash
export PINACE_PACKAGE_ID=0x...
export SUI_NETWORK=testnet # or mainnet, devnet

pnpm start
```

The script currently prints the PTBs it would submit. Wire in a real signer + funded account once the `core` package is deployed.
