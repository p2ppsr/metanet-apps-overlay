import { describe, expect, it } from 'vitest'
import {
  LockingScript,
  PrivateKey,
  ProtoWallet,
  PublicKey,
  Script,
  Transaction,
  Utils,
  type WalletProtocol
} from '@bsv/sdk'
import AppsTopicManager from '../backend/src/AppsTopicManager.js'

const protocolID: WalletProtocol = [1, 'metanet apps']

function pushDropScript (publicKey: PublicKey, fields: number[][]): LockingScript {
  const publicKeyBytes = Utils.toArray(publicKey.toString(), 'hex')
  const chunks: Array<{ op: number, data?: number[] }> = [
    { op: publicKeyBytes.length, data: publicKeyBytes },
    { op: 0xac }
  ]
  for (const field of fields) {
    chunks.push(field.length <= 75
      ? { op: field.length, data: field }
      : field.length <= 255
        ? { op: 0x4c, data: field }
        : { op: 0x4d, data: field })
  }
  let remaining = fields.length
  while (remaining > 1) {
    chunks.push({ op: 0x6d })
    remaining -= 2
  }
  if (remaining === 1) chunks.push({ op: 0x75 })
  return new LockingScript(chunks)
}

async function appScript (keyID: string): Promise<LockingScript> {
  const privateKey = PrivateKey.fromRandom()
  const publisher = privateKey.toPublicKey().toString()
  const metadata = Utils.toArray(JSON.stringify({
    version: '0.1.0',
    name: 'Canonical Fixture',
    description: 'Validates the deployed Apps topic package adapter.',
    icon: 'https://example.com/icon.png',
    httpURL: 'https://example.com/',
    domain: 'example.com',
    publisher,
    release_date: '2026-07-21T00:00:00.000Z'
  }), 'utf8')
  const signer = new ProtoWallet(privateKey)
  const { signature } = await signer.createSignature({
    data: metadata,
    protocolID,
    keyID,
    counterparty: 'anyone'
  })
  const anyone = new ProtoWallet('anyone')
  const { publicKey } = await anyone.getPublicKey({ protocolID, keyID, counterparty: publisher })
  return pushDropScript(PublicKey.fromString(publicKey), [metadata, Array.from(signature)])
}

function transactionWith (lockingScript: LockingScript): Transaction {
  const source = new Transaction()
  source.addOutput({ lockingScript: new LockingScript([]), satoshis: 1000 })
  const transaction = new Transaction()
  transaction.addInput({ sourceTransaction: source, sourceOutputIndex: 0, unlockingScript: new Script() })
  transaction.addOutput({ lockingScript, satoshis: 1 })
  return transaction
}

describe('canonical Apps package adapter', () => {
  it('admits the established key-ID-1 v0.1 token', async () => {
    const result = await new AppsTopicManager().identifyAdmissibleOutputs(
      transactionWith(await appScript('1')).toBEEF(),
      []
    )
    expect(result.outputsToAdmit).toEqual([0])
  })

  it('rejects the legacy default-key token', async () => {
    const result = await new AppsTopicManager().identifyAdmissibleOutputs(
      transactionWith(await appScript('default')).toBEEF(),
      []
    )
    expect(result.outputsToAdmit).toEqual([])
  })
})
