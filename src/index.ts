import OAuth from "oauth-1.0a";
import { HmacSHA1, enc } from "crypto-js";
import type { GETTweetsIdResponse, POSTTweetsResponse } from "twitter-types";

export interface Env {
  TWITTER_API_KEY: string;
  TWITTER_API_KEY_SECRET: string;
  TWITTER_BEARER_TOKEN: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_TOKEN_SECRET: string;
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  OPENAI_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const oauth = new OAuth({
      consumer: {
        key: env.TWITTER_API_KEY,
        secret: env.TWITTER_API_KEY_SECRET,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return HmacSHA1(baseString, key).toString(enc.Base64);
      },
    });

    const oauthToken = {
      key: env.TWITTER_ACCESS_TOKEN,
      secret: env.TWITTER_ACCESS_TOKEN_SECRET,
    };

    const blob = await request.blob();
    const text = await blob.text();

    let url: URL;
    try {
      url = new URL(text);
    } catch (error) {
      console.log("ERROR", error);
      return new Response("Invalid URL", { status: 400 });
    }

    const findTweetRequestData = {
      url: `https://api.twitter.com/2/tweets/${
        url.pathname.split("/status/")[1]
      }`,
      method: "GET",
    };
    const findTweetResponse = await fetch(findTweetRequestData.url, {
      method: findTweetRequestData.method,
      headers: {
        ...oauth.toHeader(oauth.authorize(findTweetRequestData, oauthToken)),
        "Content-Type": "application/json",
      },
    });
    const findTweetJson = await findTweetResponse.json<GETTweetsIdResponse>();

    const originalTweet = findTweetJson.data.text.replace(
      /(?:https?|ftp):\/\/[\n\S]+/g,
      ""
    );
    if (originalTweet.length < 150 && Math.random() < 0.3) {
      console.log("ERROR", "Tweet too short", originalTweet);
      return new Response("Tweet too short");
    }

    const prompt = `Write a haiku for the news story: ${originalTweet}`;
    const openApiResponse = await fetch(
      "https://api.openai.com/v1/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-davinci-003",
          best_of: 1,
          echo: false,
          frequency_penalty: 0,
          max_tokens: 256,
          presence_penalty: 0,
          temperature: 0.7,
          top_p: 1,
          prompt,
        }),
      }
    );
    const completion = await openApiResponse.json<{
      id: string;
      choices: { text: string }[];
    }>();
    const result = completion.choices[0]?.text;
    if (!result) {
      console.log("ERROR", JSON.stringify(completion));
      return new Response("No result from OpenAI", { status: 400 });
    }

    const postTweetRequestData = {
      url: `https://api.twitter.com/1.1/statuses/update.json?status=${encodeURIComponent(
        result
      )}&attachment_url=${encodeURIComponent(
        `https://twitter.com/${findTweetJson.data.author_id}/status/${findTweetJson.data.id}`
      )}`,
      method: "POST",
    };
    const postTweetResponse = await fetch(postTweetRequestData.url, {
      method: postTweetRequestData.method,
      headers: {
        ...oauth.toHeader(oauth.authorize(postTweetRequestData, oauthToken)),
        "Content-Type": "application/json",
      },
    });
    if (!postTweetResponse.ok) {
      console.log("ERROR", postTweetResponse.statusText);
      console.log("ERROR", JSON.stringify(await postTweetResponse.json()));
      return new Response("Error posting tweet", { status: 400 });
    }

    const postTweetJson = await postTweetResponse.json<
      POSTTweetsResponse["data"]
    >();
    return new Response(`OK - ${postTweetJson.id}`);
  },
};
