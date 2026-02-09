# How to get a free Gemini API key

The bot uses **Google Gemini** for the "Shaxsiy doktor" (personal doctor) AI feature. Gemini has a **free tier** with no cost for limited usage.

## Steps

1. **Open Google AI Studio**  
   Go to: **https://aistudio.google.com/app/apikey**

2. **Sign in** with your Google account.

3. **Create or select a project**  
   - If you’re new, a default project and API key may already be created.  
   - Otherwise, click **Create API key** and choose or create a project.

4. **Copy the API key**  
   - Create an API key if you don’t have one.  
   - Copy the key (it looks like `AIza...`).

5. **Add it to the bot**  
   In `apps/telegram-bot/.env` add:
   ```env
   GEMINI_API_KEY=AIza...your_key_here
   ```

6. **Restart the bot**  
   Restart the telegram-bot app so it loads the new env.

## Free tier (summary)

- **Cost:** Free for the limits below.  
- **Models:** You can use e.g. **Gemini 2.0 Flash** (what the bot uses).  
- **Limits:** Rate and usage limits apply; enough for development and moderate use.  
- **Details:**  
  - [API keys](https://ai.google.dev/gemini-api/docs/api-key)  
  - [Pricing / free tier](https://ai.google.dev/gemini-api/docs/pricing)

## Security

- **Do not commit** your API key to Git. Keep it only in `.env` (and ensure `.env` is in `.gitignore`).  
- Use the key only in **server-side** code (e.g. this bot), not in mobile or web client apps.

## If something goes wrong

- **Invalid API key:** Check that you pasted the full key and that there are no extra spaces.  
- **Quota exceeded:** You’ve hit the free tier limit; wait or check the [pricing page](https://ai.google.dev/gemini-api/docs/pricing). If you see **429** with **limit: 0**, your free tier for that model has no quota: create a **new API key** (and project) in AI Studio, or enable billing. To list models your key supports: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"`.
