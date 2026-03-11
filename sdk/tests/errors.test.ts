import { describe, it, expect } from 'vitest'
import { SSSError, SssError, TokenPausedError, FeatureNotEnabledError } from '../src/errors'

describe('SSSError', () => {
  it('SSSError is exported from sdk', () => {
    expect(SSSError).toBeDefined()
  })

  it('SssError is exported from sdk (spec compliant)', () => {
    expect(SssError).toBeDefined()
  })

  it('SSSError can be constructed with a code', () => {
    const err = new SSSError('Unauthorized', 6000)
    expect(err.message).toBe('Unauthorized')
    expect(err.code).toBe(6000)
    expect(err.errorCode).toBe(6000)
  })

  it('SSSError is instanceof Error', () => {
    const err = new SSSError('test', 6000)
    expect(err instanceof Error).toBe(true)
  })

  it('TokenPausedError exists', () => {
    const err = new TokenPausedError()
    expect(err instanceof SSSError).toBe(true)
    expect(err.name).toBe('TokenPausedError')
  })

  it('FeatureNotEnabledError exists', () => {
    const err = new FeatureNotEnabledError('test')
    expect(err instanceof SSSError).toBe(true)
    expect(err.name).toBe('FeatureNotEnabledError')
  })

  it('SSSError.name is SSSError', () => {
    const err = new SSSError('test', 6000)
    expect(err.name).toBe('SSSError')
  })
})
