import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import puppeteer from '@cloudflare/puppeteer';


export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {

	async run(event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
		const collectedData = await step.do("Collect rendered destination page data", async () => {
			const browser = await puppeteer.launch(this.env.VIRTUAL_BROWSER);
			const page = await browser.newPage();
			const response = await page.goto(event.payload.destinationUrl);

			await page.waitForNetworkIdle();

			const bodyText = (await page.$eval('body', (el) => el.innerText)) as string;
			const html = await page.content();
			const status = response ? response.status() : 0;

			await browser.close();
			return {
				bodyText,
				html,
				status,
			};
		});
		console.log(collectedData);
	}
}
