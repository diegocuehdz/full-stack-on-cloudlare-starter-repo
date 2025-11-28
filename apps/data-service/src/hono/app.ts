import { Hono } from 'hono';

import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { type LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

import { getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';

export const App = new Hono<{ Bindings: Env }>();

App.get('/do/:name', async (c) => {
	const name = c.req.param('name');

	const doId = c.env.EVALUATION_SCHEDULER.idFromName(name);
	const stub = c.env.EVALUATION_SCHEDULER.get(doId);

	await stub.increment();
	const count = await stub.getCount();

	return c.json({
		count
	});
});

App.get('/:id', async (c) => {
	const id = c.req.param('id');

	const linkFromDb = await getRoutingDestinations(c.env, id)
	if (!linkFromDb) return c.text('Destination link not found', 404)

	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf)
	if (!cfHeader.success) return c.text('Invalid Cloudflare headers', 400)

	const headers = cfHeader.data;
	const destination = getDestinationForCountry(linkFromDb, headers.country)

	const queueCall = c.env.QUEUE.send({
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
	} satisfies LinkClickMessageType)
	c.executionCtx.waitUntil(queueCall);

	return c.redirect(destination);
})
