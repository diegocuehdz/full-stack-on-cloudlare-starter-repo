import { Hono } from 'hono';

import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { type LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

import { captureLinkClickInBackground, getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';

export const App = new Hono<{ Bindings: Env }>();

App.get('/click-socket', async (c) => {
	const upgradeHeader = c.req.header('Upgrade');
	if (!upgradeHeader || upgradeHeader !== 'websocket') {
		return c.text('Expected Upgrade: websocket', 426);
	}

	//const accountId = c.req.header('account-id')
	const accountId = "1234567890";
	if (!accountId) return c.text('No Headers', 404);
	const doId = c.env.LINK_CLICK_TRACKER_OBJECT.idFromName(accountId);
	const stub = c.env.LINK_CLICK_TRACKER_OBJECT.get(doId);
	return await stub.fetch(c.req.raw)
})

App.get('/:id', async (c) => {
	const id = c.req.param('id');

	const linkFromDb = await getRoutingDestinations(c.env, id)
	if (!linkFromDb) return c.text('Destination link not found', 404)

	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf)
	if (!cfHeader.success) return c.text('Invalid Cloudflare headers', 400)

	const headers = cfHeader.data;
	const destination = getDestinationForCountry(linkFromDb, headers.country)

	const queueMessage = {
		type: "LINK_CLICK",
		data: {
			id: id,
			country: headers.country,
			destination: destination,
			accountId: linkFromDb.accountId,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Date().toISOString(),
		}
	} satisfies LinkClickMessageType
	c.executionCtx.waitUntil(captureLinkClickInBackground(c.env, queueMessage));

	return c.redirect(destination);
})

