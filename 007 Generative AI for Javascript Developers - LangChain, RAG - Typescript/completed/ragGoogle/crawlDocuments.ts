import * as cheerio from "cheerio";
import fetch from "node-fetch";
import urlModule from "url";
import cliProgress from "cli-progress";

// Note: Full Langchain document takes a very long time to download. A short documentation is provided for the course (recommended).

const LANGCHAIN_DOCS_HOME =
  "https://learn-with-amit.github.io/genai-js/langchain/";

const LANGCHAIN_DOCS_PREFIX = "";

// use following links if you want to use full langchain documentation. This can take several minutes to process.

// const LANGCHAIN_DOCS_HOME =
//   "https://js.langchain.com/docs/introduction";

// const LANGCHAIN_DOCS_PREFIX = "/docs/";

const progressBar = new cliProgress.SingleBar({
  format: "Documents Crawled: {value}",
});

export async function crawlLangchainDocsUrls(): Promise<string[]> {
  const urls = new Set<string>();

  console.log("Crawling Langchain Documentation...");
  progressBar.start(1000, 0);

  await fetchLinkedUrls(LANGCHAIN_DOCS_HOME, urls);

  progressBar.stop();
  return [...urls];
}

async function fetchLinkedUrls(url: string, downloadedUrls: Set<string>) {
  if (downloadedUrls.has(url)) return;

  progressBar.update(downloadedUrls.size);
  try {
    const response = await fetch(url);

    const html = await response.text();
    const $ = cheerio.load(html);

    downloadedUrls.add(url); // Add URL to downloaded set

    // Extract all anchor tags
    const links: string[] = [];
    $("a").each((index, element) => {
      const href = $(element).attr("href");
      if (href && href.startsWith(LANGCHAIN_DOCS_PREFIX)) {
        links.push(href);
      }
    });

    // Download HTML from linked URLs with reduced depth
    for (const link of links) {
      const absoluteUrl = urlModule.resolve(url, link);
      await fetchLinkedUrls(absoluteUrl, downloadedUrls);
    }
  } catch (error) {
    console.error(`Error downloading HTML from ${url}: ${error}`);
  }
}
