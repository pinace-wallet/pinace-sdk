/**
 * Pinace MCP server (example).
 *
 * Stub implementation — fill in tool handlers as `@pinace/agent-sdk` and `@pinace/core`
 * stabilize. The goal is to let an LLM client (Claude Desktop, Operator, Cursor) call
 * `pinace.propose_and_settle` and `pinace.get_pool_summary` as native tools.
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { PinaceAgent } from '@pinace/agent-sdk';

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const agentSecret = readEnv('AGENT_SECRET_KEY');
  const packageId = readEnv('PINACE_PACKAGE_ID');
  const poolId = readEnv('PINACE_POOL_ID');
  const network = (process.env.SUI_NETWORK ?? 'mainnet') as 'mainnet' | 'testnet' | 'devnet';

  const suiClient = new SuiGrpcClient({
    network,
    baseUrl: process.env.SUI_RPC_URL ?? `https://fullnode.${network}.sui.io:443`,
  });
  const signer = Ed25519Keypair.fromSecretKey(agentSecret);

  const agent = new PinaceAgent({
    suiClient,
    signer,
    packageId,
    poolId,
  });

  // TODO: wire @modelcontextprotocol/sdk Server here and expose:
  //   - pinace.propose_and_settle
  //   - pinace.get_pool_summary
  console.error(
    'Pinace MCP server scaffold ready. Agent address:',
    signer.toSuiAddress(),
    '| pool:',
    poolId,
    '| pkg:',
    packageId,
    '| agent ref:',
    agent.poolId,
  );
}

main().catch((err) => {
  console.error('Pinace MCP server failed:', err);
  process.exit(1);
});
