import { Hono } from 'hono';

import { getLink } from '@repo/data-ops/queries/links';

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	const id = c.req.param('id');
	const linkFromDb = await getLink(id)
	return c.json(linkFromDb)
})
