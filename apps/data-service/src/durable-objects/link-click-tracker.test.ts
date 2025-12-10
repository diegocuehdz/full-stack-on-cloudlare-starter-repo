import { beforeEach, describe, expect, it, vi, } from 'vitest'

import { getRecentClicks, deleteClicksBefore } from '../helpers/durable-queries'

import { LinkClickTracker } from './link-click-tracker'


vi.mock('@/helpers/durable-queries', () => ({
	getRecentClicks: vi.fn(),
	deleteClicksBefore: vi.fn(),
}))

vi.mock('cloudflare:workers', () => ({
	DurableObject: class MockDurableObject {
		ctx: any;
		env: any;
		constructor(ctx: any, env: any) {
			this.ctx = ctx;
			this.env = env;
		}
	}
}))


class MockSqlStorage {
	exec = vi.fn();
	databaseSize = 0;
	Cursor = vi.fn();
	Statement = vi.fn();
}

class MockWebSocket {
	send = vi.fn();
	close = vi.fn();
	addEventListener = vi.fn();
	removeEventListener = vi.fn();
	dispatchEvent = vi.fn();
	readyState = 1;
	url = '';
	protocol = '';
	extensions = '';
	bufferedAmount = 0;
	binaryType = 'blob' as 'blob' | 'arraybuffer';
	onopen = null;
	onmessage = null
	onclose = null;
	onerror = null;
	accept = vi.fn();
	serializeAttachment = vi.fn();
	deserializeAttachment = vi.fn();
}

class MockDurableObjectState {
	storage = {
		sql: new MockSqlStorage(),
		get: vi.fn(),
		put: vi.fn(),
		getAlarm: vi.fn(),
		setAlarm: vi.fn(),
	}
	getWebSocket = vi.fn();
	acceptWebSocket = vi.fn();
	blockConcurrencyWhile = vi.fn((fn: () => Promise<void>) => fn());
}


(global as any).WebSocket = vi.fn().mockImplementation(() => {
	const client = new MockWebSocket();
	const server = new MockWebSocket();
	return {
		0: client,
		1: server,
	};
});

const OriginalResponse = global.Response;
global.Response = vi.fn().mockImplementation((body, init) => {
	if (init?.webSocket) {
		return {
			status: init.status || 200,
			webSocket: init.webSocket,
		}
	}
	return new OriginalResponse(body, init);
}) as any;

vi.mock('moment', () => ({
	default: vi.fn(() => ({
		add: vi.fn().mockReturnThis(),
		valueOf: vi.fn().mockReturnValue(1_640_995_300_000),
	}))
}))


describe('LinkClickTracker business logic', () => {

	const defaultLat = 40.7128
	const defaultLong = -74.006
	const defaultCountry = 'US'
	const defaultTimestamp = 1_640_995_200_000

	let mockCtx: MockDurableObjectState;
	let tracker: LinkClickTracker

	beforeEach(() => {
		vi.clearAllMocks();
		mockCtx = new MockDurableObjectState();
		mockCtx.storage.get.mockResolvedValue(0)
		tracker = new LinkClickTracker(mockCtx as any, {} as any);
	})

	describe('addClick test cases', () => {
		it('should insert click data into database', async () => {
			mockCtx.storage.getAlarm.mockResolvedValue(123456789);

			await tracker.addClick(defaultLat, defaultLong, defaultCountry, defaultTimestamp);
			expect(mockCtx.storage.sql.exec).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO geo_link_clicks'),
				defaultLat,
				defaultLong,
				defaultCountry,
				defaultTimestamp
			)
		})

		it('should set alarm if none extists', async () => {
			mockCtx.storage.getAlarm.mockResolvedValue(null);

			await tracker.addClick(defaultLat, defaultLong, defaultCountry, defaultTimestamp);

			expect(mockCtx.storage.getAlarm).toHaveBeenCalled()
			expect(mockCtx.storage.setAlarm).toHaveBeenCalledWith(defaultTimestamp + 100_000)
		})

		it('should not set alarm if one already exists', async () => {
			mockCtx.storage.getAlarm.mockResolvedValue(123456789);

			await tracker.addClick(defaultLat, defaultLong, defaultCountry, defaultTimestamp);

			expect(mockCtx.storage.getAlarm).toHaveBeenCalled()
			expect(mockCtx.storage.setAlarm).not.toHaveBeenCalled()
		})
	})

	describe('alarm test cases', () => {
		it('should get recent clicks and send to websockets', async () => {
			const mockClickData = {
				clicks: [],
				mostRecentTime: 1_640_995_250_000,
				oldestTime: 1_640_995_100_000,
			}

			vi.mocked(getRecentClicks).mockResolvedValue(mockClickData);

			const mockSocket1 = new MockWebSocket()
			const mockSocket2 = new MockWebSocket()
			mockCtx.getWebSocket.mockReturnValue([mockSocket1, mockSocket2]);

			const flushSpyOn = vi.spyOn(tracker, 'flushOffsetTimes').mockResolvedValue();
			await tracker.alarm();

			expect(getRecentClicks).toHaveBeenCalledWith(mockCtx.storage.sql, 0);
			expect(mockSocket1.send).toHaveBeenCalledWith(JSON.stringify(mockClickData.clicks));
			expect(mockSocket2.send).toHaveBeenCalledWith(JSON.stringify(mockClickData.clicks));
			expect(flushSpyOn).toHaveBeenCalledWith(1640995250000, 1_640_995_100_000);
			expect(deleteClicksBefore).toHaveBeenCalledWith(mockCtx.storage.sql, 1_640_995_100_000);
		})
	})
})
