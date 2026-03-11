import { describe, it, expect } from 'vitest'
import { PublicKey } from '@solana/web3.js'
import { ComplianceModule } from '../src/modules/compliance'

const MINT = PublicKey.unique()

describe('ComplianceModule', () => {
  it('ComplianceModule can be instantiated', () => {
    expect(() => new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)).not.toThrow()
  })

  it('addToBlacklist method exists', () => {
    const m = new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)
    expect(typeof m.addToBlacklist).toBe('function')
  })

  it('removeFromBlacklist method exists', () => {
    const m = new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)
    expect(typeof m.removeFromBlacklist).toBe('function')
  })

  it('seize method exists', () => {
    const m = new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)
    expect(typeof m.seize).toBe('function')
  })

  it('addToBlacklist returns a Promise', () => {
    const m = new ComplianceModule({ programId: PublicKey.unique(), methods: { addToBlacklist: () => ({ accounts: () => ({ instruction: async () => ({}) }) }) } } as any, MINT)
    const result = m.addToBlacklist(PublicKey.unique(), PublicKey.unique(), 'test reason')
    expect(result).toBeInstanceOf(Promise)
    result.catch(() => {}) // prevent unhandled rejection
  })

  it('addToBlacklist with empty reason rejects due to mock structure', async () => {
    const m = new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)
    await expect(m.addToBlacklist(PublicKey.unique(), PublicKey.unique(), '')).rejects.toThrow()
  })

  it('getBlacklistEntry method exists', () => {
    const m = new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)
    expect(typeof m.getBlacklistEntry).toBe('function')
  })
  
  it('isBlacklisted method exists', () => {
    const m = new ComplianceModule({ programId: PublicKey.unique() } as any, MINT)
    expect(typeof m.isBlacklisted).toBe('function')
  })
})
