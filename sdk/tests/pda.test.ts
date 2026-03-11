import { describe, it, expect } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import {
  findConfigPda,
  findBlacklistPda,
  findQuotaPda,
  findPauseStatePda,
} from '../src/pda'

const PROGRAM_ID = new PublicKey('HLvhfKVfGfKXVNS9tZ1q7SNS4w9mQmcjre758QFhbZDZ')
const MINT = PublicKey.unique()
const WALLET = PublicKey.unique()

describe('PDA derivation', () => {
  it('findConfigPda is deterministic', () => {
    const [pda1] = findConfigPda(MINT, PROGRAM_ID)
    const [pda2] = findConfigPda(MINT, PROGRAM_ID)
    expect(pda1.toBase58()).toBe(pda2.toBase58())
  })

  it('findConfigPda returns valid public key', () => {
    const [pda] = findConfigPda(MINT, PROGRAM_ID)
    expect(() => new PublicKey(pda.toBase58())).not.toThrow()
  })

  it('different mints produce different config PDAs', () => {
    const [pda1] = findConfigPda(PublicKey.unique(), PROGRAM_ID)
    const [pda2] = findConfigPda(PublicKey.unique(), PROGRAM_ID)
    expect(pda1.toBase58()).not.toBe(pda2.toBase58())
  })

  it('findBlacklistPda is deterministic', () => {
    const [pda1] = findBlacklistPda(MINT, WALLET, PROGRAM_ID)
    const [pda2] = findBlacklistPda(MINT, WALLET, PROGRAM_ID)
    expect(pda1.toBase58()).toBe(pda2.toBase58())
  })

  it('blacklist PDAs differ for different wallets', () => {
    const [pda1] = findBlacklistPda(MINT, PublicKey.unique(), PROGRAM_ID)
    const [pda2] = findBlacklistPda(MINT, PublicKey.unique(), PROGRAM_ID)
    expect(pda1.toBase58()).not.toBe(pda2.toBase58())
  })

  it('blacklist PDAs differ for different mints', () => {
    const [pda1] = findBlacklistPda(PublicKey.unique(), WALLET, PROGRAM_ID)
    const [pda2] = findBlacklistPda(PublicKey.unique(), WALLET, PROGRAM_ID)
    expect(pda1.toBase58()).not.toBe(pda2.toBase58())
  })

  it('findQuotaPda is deterministic', () => {
    const minter = PublicKey.unique()
    const [pda1] = findQuotaPda(MINT, minter, PROGRAM_ID)
    const [pda2] = findQuotaPda(MINT, minter, PROGRAM_ID)
    expect(pda1.toBase58()).toBe(pda2.toBase58())
  })

  it('findPauseStatePda is deterministic', () => {
    const [pda1] = findPauseStatePda(MINT, PROGRAM_ID)
    const [pda2] = findPauseStatePda(MINT, PROGRAM_ID)
    expect(pda1.toBase58()).toBe(pda2.toBase58())
  })

  it('pause PDA differs per mint', () => {
    const [pda1] = findPauseStatePda(PublicKey.unique(), PROGRAM_ID)
    const [pda2] = findPauseStatePda(PublicKey.unique(), PROGRAM_ID)
    expect(pda1.toBase58()).not.toBe(pda2.toBase58())
  })

  it('all PDAs are off-curve (valid PDA requirement)', () => {
    const [configPDA] = findConfigPda(MINT, PROGRAM_ID)
    const [blacklistPDA] = findBlacklistPda(MINT, WALLET, PROGRAM_ID)
    expect(PublicKey.isOnCurve(configPDA.toBytes())).toBe(false)
    expect(PublicKey.isOnCurve(blacklistPDA.toBytes())).toBe(false)
  })
})
