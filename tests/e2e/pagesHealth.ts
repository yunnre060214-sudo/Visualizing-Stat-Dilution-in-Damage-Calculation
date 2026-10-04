import type { Page, Request, Response } from "@playwright/test";

const checkedResourceTypes = new Set(["document", "script", "stylesheet"]);

export async function inspectPageHealth(page: Page, path: string): Promise<string[]> {
  const failures = new Set<string>();
  const onRequestFailed = (request: Request) => {
    if (checkedResourceTypes.has(request.resourceType())) {
      failures.add(`${request.url()} request failed`);
    }
  };
  const onResponse = (response: Response) => {
    if (checkedResourceTypes.has(response.request().resourceType()) && !response.ok()) {
      failures.add(`${response.url()} ${response.status()}`);
    }
  };

  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  try {
    const documentResponse = await page.goto(path);
    if (documentResponse === null || !documentResponse.ok()) {
      failures.add(`${page.url()} ${documentResponse?.status() ?? "no response"}`);
    }
    await page.waitForLoadState("networkidle");
  } finally {
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }

  return [...failures].sort();
}
