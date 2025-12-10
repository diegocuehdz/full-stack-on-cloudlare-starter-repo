import { beforeEach, describe, expect, it, vi, } from "vitest";

import { addLinkClick } from "@repo/data-ops/queries/links";
import type { LinkClickMessageType } from "@repo/data-ops/zod-schema/queue";

import { scheduleEvalWorkflow } from "@/helpers/route-ops";

import { handleLinkClick } from "./link-clicks";


vi.mock('@repo/data-ops/queries/links', () => ({
	addLinkClick: vi.fn(),
}));

vi.mock('@/helpers/route-ops', () => ({
	scheduleEvalWorkflow: vi.fn(),
}))

describe('handleLinkClick test cases', () => {
	const mockEnv = {} as Cloudflare.Env

	const mockEvent: LinkClickMessageType = {
		type: 'LINK_CLICK',
		data: {
			timestamp: '2024-01-01T00:00:00Z',
			id: 'test-link-id',
			accountId: 'test-account-id',
			destination: 'https://example.com',
			country: 'US',
			latitude: 37.7749,
			longitude: -122.4194
		}
	}

	beforeEach(() => {
		vi.clearAllMocks();
	})

	it('should call addLinkClick with event data', async () => {
		await handleLinkClick(mockEnv, mockEvent);
		expect(addLinkClick).toHaveBeenCalledWith(mockEvent.data);
	})

	it('should call scheduleEvalWorkflow with env and event', async () => {
		await handleLinkClick(mockEnv, mockEvent);
		expect(scheduleEvalWorkflow).toHaveBeenCalledWith(mockEnv, mockEvent);
	})

	it('should call both functions in sequence', async () => {
		const addLinkClickMock = vi.mocked(addLinkClick);
		const scheduleEvalWorkflowMock = vi.mocked(scheduleEvalWorkflow);

		await handleLinkClick(mockEnv, mockEvent);

		expect(addLinkClickMock).toHaveBeenCalledBefore(scheduleEvalWorkflowMock);
	})

	it('should handle event without optional fields', async () => {
		const eventWithoutOptional: LinkClickMessageType = {
			type: 'LINK_CLICK',
			data: {
				timestamp: '2024-01-01T00:00:00Z',
				id: 'test-link-id',
				accountId: 'test-account-id',
				destination: 'https://example.com',
			}
		}

		await handleLinkClick(mockEnv, eventWithoutOptional);

		expect(addLinkClick).toHaveBeenCalledWith(eventWithoutOptional.data);
		expect(scheduleEvalWorkflow).toHaveBeenCalledWith(mockEnv, eventWithoutOptional);
	})

	it('should hande errors from addLinkClick gracefully', async () => {
		const addLinkClickMock = vi.mocked(addLinkClick);
		addLinkClickMock.mockRejectedValueOnce(new Error('DB Error'));

		await expect(handleLinkClick(mockEnv, mockEvent)).rejects.toThrow('DB Error');
		expect(scheduleEvalWorkflow).not.toHaveBeenCalled();
	})

	it('should hande errors from scheduleEval gracefully', async () => {
		const scheduleEvalWorkflowMock = vi.mocked(scheduleEvalWorkflow);
		scheduleEvalWorkflowMock.mockRejectedValueOnce(new Error('Eval Error'));

		await expect(handleLinkClick(mockEnv, mockEvent)).rejects.toThrow('Eval Error');
		expect(addLinkClick).toHaveBeenCalledWith(mockEvent.data);
	})
})
