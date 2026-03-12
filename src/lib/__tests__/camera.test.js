import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock navigator.mediaDevices before importing
const mockGetUserMedia = vi.fn();
vi.stubGlobal('navigator', {
  mediaDevices: { getUserMedia: mockGetUserMedia },
  deviceMemory: undefined,
  hardwareConcurrency: undefined,
});

// Dynamic import to pick up navigator stubs
let startCamera, stopCamera;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  // Reset navigator properties
  Object.defineProperty(navigator, 'deviceMemory', { value: undefined, writable: true, configurable: true });
  Object.defineProperty(navigator, 'hardwareConcurrency', { value: undefined, writable: true, configurable: true });
  const mod = await import('../camera.js');
  startCamera = mod.startCamera;
  stopCamera = mod.stopCamera;
});

describe('startCamera', () => {
  it('requests 640x480@30fps on normal devices', async () => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    const fakeStream = { getTracks: () => [] };
    mockGetUserMedia.mockResolvedValueOnce(fakeStream);

    const stream = await startCamera();
    expect(stream).toBe(fakeStream);
    const constraints = mockGetUserMedia.mock.calls[0][0];
    expect(constraints.video.width.ideal).toBe(640);
    expect(constraints.video.height.ideal).toBe(480);
    expect(constraints.video.frameRate.ideal).toBe(30);
  });

  it('requests 320x240@15fps on low-spec devices (low memory)', async () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: 2, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true });
    const fakeStream = { getTracks: () => [] };
    mockGetUserMedia.mockResolvedValueOnce(fakeStream);

    const stream = await startCamera();
    expect(stream).toBe(fakeStream);
    const constraints = mockGetUserMedia.mock.calls[0][0];
    expect(constraints.video.width.ideal).toBe(320);
    expect(constraints.video.height.ideal).toBe(240);
    expect(constraints.video.frameRate.ideal).toBe(15);
  });

  it('requests 320x240@15fps on low-spec devices (low CPU cores)', async () => {
    Object.defineProperty(navigator, 'deviceMemory', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, configurable: true });
    const fakeStream = { getTracks: () => [] };
    mockGetUserMedia.mockResolvedValueOnce(fakeStream);

    const stream = await startCamera();
    expect(stream).toBe(fakeStream);
    const constraints = mockGetUserMedia.mock.calls[0][0];
    expect(constraints.video.width.ideal).toBe(320);
    expect(constraints.video.frameRate.ideal).toBe(15);
  });

  it('falls back to lower resolution on OverconstrainedError', async () => {
    const err = new Error('overconstrained');
    err.name = 'OverconstrainedError';
    const fakeStream = { getTracks: () => [] };
    mockGetUserMedia
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(fakeStream);

    const stream = await startCamera();
    expect(stream).toBe(fakeStream);
    expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    // Second call should have lower resolution
    const fallbackConstraints = mockGetUserMedia.mock.calls[1][0];
    expect(fallbackConstraints.video.width.ideal).toBe(320);
  });

  it('falls back to minimal constraints when both attempts fail', async () => {
    const err = new Error('overconstrained');
    err.name = 'OverconstrainedError';
    const fakeStream = { getTracks: () => [] };
    mockGetUserMedia
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce(fakeStream);

    const stream = await startCamera();
    expect(stream).toBe(fakeStream);
    expect(mockGetUserMedia).toHaveBeenCalledTimes(3);
    // Third call should have minimal constraints
    const minimalConstraints = mockGetUserMedia.mock.calls[2][0];
    expect(minimalConstraints.video.facingMode).toBe('user');
    expect(minimalConstraints.video.width).toBeUndefined();
  });

  it('re-throws non-OverconstrainedError', async () => {
    const err = new Error('denied');
    err.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(err);

    await expect(startCamera()).rejects.toThrow('denied');
  });
});

describe('stopCamera', () => {
  it('stops all tracks', () => {
    const stop1 = vi.fn();
    const stop2 = vi.fn();
    const stream = { getTracks: () => [{ stop: stop1 }, { stop: stop2 }] };
    stopCamera(stream);
    expect(stop1).toHaveBeenCalled();
    expect(stop2).toHaveBeenCalled();
  });

  it('handles null stream gracefully', () => {
    expect(() => stopCamera(null)).not.toThrow();
  });
});
