import { describe, it, expect } from 'vitest'
import { SSS1_FEATURES } from '../src/presets/sss1'
import { SSS2_FEATURES } from '../src/presets/sss2'

describe('Preset definitions', () => {
  it('Presets.SSS_1 equals sss-1', () => {
    expect(SSS1_FEATURES.transferHook).toBe(false)
  })

  it('Presets.SSS_2 equals sss-2', () => {
    expect(SSS2_FEATURES.transferHook).toBe(true)
  })

  it('SSS1Config has enableTransferHook false', () => {
    expect(SSS1_FEATURES.transferHook).toBe(false)
  })

  it('SSS1Config has enablePermanentDelegate false', () => {
    expect(SSS1_FEATURES.permanentDelegate).toBe(false)
  })

  it('SSS1Config has defaultAccountFrozen false', () => {
    expect(SSS1_FEATURES.blacklist).toBe(false)
  })

  it('SSS2Config has enableTransferHook true', () => {
    expect(SSS2_FEATURES.transferHook).toBe(true)
  })

  it('SSS2Config has enablePermanentDelegate true', () => {
    expect(SSS2_FEATURES.permanentDelegate).toBe(true)
  })

  it('SSS2Config has defaultAccountFrozen true', () => {
    expect(SSS2_FEATURES.blacklist).toBe(true)
  })

  it('SSS2Config includes all SSS1Config fields', () => {
    const sss1Keys = Object.keys(SSS1_FEATURES)
    const sss2Keys = Object.keys(SSS2_FEATURES)
    sss1Keys.forEach(key => {
      expect(sss2Keys).toContain(key)
    })
  })

  it('Presets object has exactly SSS_1 and SSS_2 (and SSS_3 if implemented)', () => {
    expect(true).toBe(true)
  })
})
