import { LambdaClient, InvokeCommand, InvocationType } from "@aws-sdk/client-lambda";
import streamDeck, { action, KeyDownEvent, SingletonAction } from "@elgato/streamdeck";

const logger = streamDeck.logger

@action({UUID: "com.mauricebrg.lambda-invoke.invoke-async"})
export class InvokeAsync extends SingletonAction<InvokeAsyncSettings> {

    // This function is called when the button is pressed
    public override async onKeyDown(ev: KeyDownEvent<InvokeAsyncSettings>): Promise<void> {
        logger.info(ev)

        const settings = parseSettingsAndAddDefaults(await ev.action.getSettings())
        // Now we know that the lambda settings aren't empty
        const statusCode = await invokeLambdaAsync(settings.lambdaSettings!)

        await ev.action.setTitle(`Response\n${statusCode}`)
        if (200 <= statusCode && statusCode < 300) {
			await ev.action.showOk()
		} else {
			await ev.action.showAlert()
		}

    }

}

type InvokeAsyncSettings = {
    lambdaSettings?: LambdaInvocationSettings
}

type LambdaInvocationSettings = {
	profile: string // Which SDK Creds to use
    region: string // Region that Lambda is located in
    functionName: string // Name of the function to execute
    event: string // Payload to send to Lambda
}

// Add default values if the settings are not set.
function parseSettingsAndAddDefaults(settings: InvokeAsyncSettings): InvokeAsyncSettings {
    return {
        lambdaSettings: {
            region: settings.lambdaSettings?.region ?? "eu-central-1",
            functionName: settings.lambdaSettings?.functionName ?? "PythonDemo",
            event: settings.lambdaSettings?.event ?? "{}",
            profile: settings.lambdaSettings?.profile ?? "default"
        }
    }
}

// Invoke the Lambda function based on our settings
async function invokeLambdaAsync(config: LambdaInvocationSettings): Promise<number> {
	const client = new LambdaClient({region: config.region, profile: config.profile})
	const command = new InvokeCommand({
		FunctionName: config.functionName,
		InvocationType: InvocationType.Event
	})

	try {
		const response = await client.send(command)
		logger.info(response)
		return response.StatusCode ?? 500
	} catch (error) {

		logger.error("Failed to invoke Lambda", error)
		return 500
	}
}