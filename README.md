# 🤖 [NewsHaikusBot](https://twitter.com/NewsHaikusBot)

A Twitter bot that generates haikus from news stories using OpenAI's GPT-3.

**Follow:** https://twitter.com/NewsHaikusBot

![Search for a solution, Natural gas too expensive, Heat pumps, be our savior](https://user-images.githubusercontent.com/2841780/206131528-19209372-53c0-4843-9d8e-8704f6fe0013.png)

## 🤞 How it works

Whenever a publication like @NYTimes tweets about a news story, a webhook request is made. We then use the OpenAI API with the prompt: "Write a haiku for the news story: " followed by the story details. We then quote the original tweet and tweet ourselves.

Since GPT-3 is still learning, the results look very similar to haikus (and often are), but are not always technically haikus.

The service is written in TypeScript and hosted on Cloudflare Workers, and the following environment variables are required:

- `TWITTER_ACCESS_TOKEN`: Twitter access token (of the authenticated user)
- `TWITTER_ACCESS_TOKEN_SECRET`: Twitter access token secret
- `TWITTER_API_KEY`: Twitter API key
- `TWITTER_API_KEY_SECRET`: Twitter API key secret
- `OPENAI_API_KEY`: OpenAI API key

The Twitter API is free but OpenAI's Davinci costs $0.02 per 1000 tokens, so each API request to write a haiku costs around $0.001. This service costs approximately $15 per month to run.

## 📄 License

[MIT](./LICENSE) © [Anand Chowdhary](https://anandchowdhary.com)
