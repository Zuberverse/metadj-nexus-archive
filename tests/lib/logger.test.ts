/**
 * Logger Tests
 *
 * Tests the structured logger for environment-aware behavior,
 * log level routing, and audio error specialization.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '@/lib/logger'

describe('logger', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('warn', () => {
    it('logs warning with formatted prefix', () => {
      logger.warn('something risky')
      expect(warnSpy).toHaveBeenCalledWith('[WARN] something risky')
    })

    it('logs warning with context', () => {
      logger.warn('something risky', { detail: 'info' })
      expect(warnSpy).toHaveBeenCalledWith('[WARN] something risky', { detail: 'info' })
    })
  })

  describe('error', () => {
    it('logs error with formatted prefix', () => {
      logger.error('critical failure')
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] critical failure')
    })

    it('logs error with context', () => {
      logger.error('critical failure', { code: 500 })
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] critical failure', { code: 500 })
    })
  })

  describe('audioError', () => {
    it('logs audio errors through the error method', () => {
      logger.audioError('Failed to decode audio', {
        code: 4,
        message: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
        url: 'https://example.com/track.mp3',
        networkState: 3,
        readyState: 0,
        trackId: 'track-1',
        trackTitle: 'Test Track',
      })

      expect(errorSpy).toHaveBeenCalledWith(
        '[ERROR] Audio Error: Failed to decode audio',
        expect.objectContaining({
          code: 4,
          message: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
          url: 'https://example.com/track.mp3',
          trackId: 'track-1',
        })
      )
    })

    it('handles minimal audio error context', () => {
      logger.audioError('Playback interrupted', {})
      expect(errorSpy).toHaveBeenCalledWith(
        '[ERROR] Audio Error: Playback interrupted',
        {}
      )
    })
  })

  describe('info', () => {
    // In test environment, isDevelopment is false, isTest is true
    // so only production-critical info messages will be logged

    it('logs critical info messages with matching prefix', () => {
      logger.info('[Rate Limiting] Threshold exceeded')
      expect(infoSpy).toHaveBeenCalledWith('[INFO] [Rate Limiting] Threshold exceeded')
    })

    it('logs circuit breaker messages', () => {
      logger.info('[Circuit Breaker] Open state entered')
      expect(infoSpy).toHaveBeenCalledWith('[INFO] [Circuit Breaker] Open state entered')
    })

    it('logs AI spending messages', () => {
      logger.info('[AI Spending] Budget alert triggered')
      expect(infoSpy).toHaveBeenCalledWith('[INFO] [AI Spending] Budget alert triggered')
    })

    it('logs startup messages', () => {
      logger.info('[Startup] Application initialized')
      expect(infoSpy).toHaveBeenCalledWith('[INFO] [Startup] Application initialized')
    })

    it('logs health messages', () => {
      logger.info('[Health] Check passed')
      expect(infoSpy).toHaveBeenCalledWith('[INFO] [Health] Check passed')
    })

    it('logs critical info with context', () => {
      logger.info('[Rate Limiting] Blocked', { ip: '1.2.3.4' })
      expect(infoSpy).toHaveBeenCalledWith(
        '[INFO] [Rate Limiting] Blocked',
        { ip: '1.2.3.4' }
      )
    })
  })
})
