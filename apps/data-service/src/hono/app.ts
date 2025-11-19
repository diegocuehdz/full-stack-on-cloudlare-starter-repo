import { Hono } from 'hono';

import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';

import { getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	const id = c.req.param('id');

	const linkFromDb = await getRoutingDestinations(c.env, id)
	if (!linkFromDb) return c.text('Destination link not found', 404)

	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf)
	if (!cfHeader.success) return c.text('Invalid Cloudflare headers', 400)

	const headers = cfHeader.data;
	const destination = getDestinationForCountry(linkFromDb, headers.country)

	return c.redirect(destination);
})
