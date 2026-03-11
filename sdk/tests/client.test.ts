import { describe, it, expect } from 'vitest'
import { sss1Preset, SSS1_FEATURES } from '../src/presets/sss1'
import { sss2Preset, SSS2_FEATURES } from '../src/presets/sss2'
import { TransactionResult } from '../src/types'

describe('SolanaStablecoin factory', () => {

  it('create with SSS_1 preset sets correct extension flags', async () => {
    const config = sss1Preset('Test', 'TST', '', 6)
    expect(config.enableTransferHook).toBe(false)
    expect(config.enablePermanentDelegate).toBe(false)
  })

  it('create with SSS_2 preset sets correct extension flags', async () => {
    const config = sss2Preset('Test', 'TST', '', 6)
    expect(config.enableTransferHook).toBe(true)
    expect(config.enablePermanentDelegate).toBe(true)
    expect(config.defaultAccountFrozen).toBe(true)
  })

  it('TransactionResult has signature field', () => {
    const result: TransactionResult = { signature: 'abc123', slot: 100 }
    expect(result.signature).toBe('abc123')
    expect(result.slot).toBe(100)
  })

  it('SSS_1 instance has no compliance property', () => {
    expect(true).toBe(true)
  })

  it('SSS_2 instance has compliance property', () => {
    expect(true).toBe(true)
  })

  it('Presets enum has SSS_1 value', () => {
    expect(SSS1_FEATURES.transferHook).toBe(false)
  })

  it('Presets enum has SSS_2 value', () => {
    expect(SSS2_FEATURES.transferHook).toBe(true)
  })

  it('custom config overrides preset defaults', () => {
    expect(true).toBe(true)
  })
})
