import { Configuration, OpenAIApi } from "openai";
import { TwitterApi } from "twitter-api-v2";

export interface Env {
  TWITTER_API_KEY: string;
  TWITTER_API_KEY_SECRET: string;
  TWITTER_BEARER_TOKEN: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_TOKEN_SECRET: string;
  OPENAI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { createCompletion } = new OpenAIApi(
      new Configuration({ apiKey: env.OPENAI_API_KEY })
    );
    const twitterClient = new TwitterApi({
      appKey: env.TWITTER_API_KEY,
      appSecret: env.TWITTER_API_KEY_SECRET,
      accessToken: env.TWITTER_ACCESS_TOKEN,
      accessSecret: env.TWITTER_ACCESS_TOKEN_SECRET,
    }).readWrite;

    const blob = await request.blob();
    const text = await blob.text();

    let url: URL;
    try {
      url = new URL(text);
    } catch (error) {
      console.log("ERROR", error);
      return new Response("Invalid URL", { status: 400 });
    }

    const tweet = await twitterClient.v2.singleTweet(
      url.pathname.split("/status/")[1]
    );
    if (tweet.errors?.length) {
      console.log("ERROR", JSON.stringify(tweet.errors));
      return new Response("Invalid tweet", { status: 400 });
    }

    const originalTweet = tweet.data.text.replace(
      /(?:https?|ftp):\/\/[\n\S]+/g,
      ""
    );
    console.log("Got tweet body", originalTweet);
    if (originalTweet.length < 150) {
      console.log("ERROR", "Tweet too short", originalTweet);
      return new Response("Tweet too short");
    }

    const prompt = `Write a haiku for the news story: ${originalTweet}`;
    const completion = await createCompletion({
      model: "text-davinci-002",
      best_of: 1,
      echo: false,
      frequency_penalty: 0,
      max_tokens: 256,
      presence_penalty: 0,
      temperature: 0.7,
      top_p: 1,
      prompt,
    });
    const status = completion.data.choices[0]?.text;
    if (!status) {
      console.log("ERROR", JSON.stringify(completion.data));
      return new Response("No status", { status: 400 });
    }

    const result = await twitterClient.v1.quote(status, tweet.data.id);
    console.log(status, tweet.data.id, result.id);
    return new Response(`OK - ${result.id}`);
  },
};
