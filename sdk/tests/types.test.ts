import { describe, it, expect } from 'vitest'
import type { TransactionResult, SSSConfig, ComplianceConfig } from '../src/types'

describe('Type shapes', () => {
  it('TransactionResult has signature and slot', () => {
    const result: TransactionResult = { signature: 'sig123', slot: 42 }
    expect(result.signature).toBeDefined()
    expect(result.slot).toBeDefined()
    expect(typeof result.signature).toBe('string')
    expect(typeof result.slot).toBe('number')
  })

  it('SSSConfig requires name, symbol, decimals', () => {
    const config: SSSConfig = {
      name: 'Test',
      symbol: 'TST',
      decimals: 6,
    }
    expect(config.name).toBe('Test')
    expect(config.symbol).toBe('TST')
    expect(config.decimals).toBe(6)
  })

  it('SSSConfig decimals can be 0', () => {
    const config: SSSConfig = { name: 'T', symbol: 'T', decimals: 0 }
    expect(config.decimals).toBe(0)
  })

  it('SSSConfig decimals can be 9', () => {
    const config: SSSConfig = { name: 'T', symbol: 'T', decimals: 9 }
    expect(config.decimals).toBe(9)
  })
})
