import { type FeedbackPayload, type SubmitFn, dataUrlToBlob } from "./core";

export const MAHAAM_FEEDBACK_ENDPOINT = "https://console.mahaam.app/api/feedback/embed";

/**
 * Posts reports to a Mahaam project's feedback inbox with a project feedback key (`pfk_…`, public-safe;
 * keep it in env rather than code). The key goes in the `public_key` multipart field, credentials are omitted
 * and no custom header is set: a header would trigger a CORS preflight the endpoint rejects (MH-727), and the
 * endpoint does not allow credentials. The page's origin must be in the key's allowed origins.
 */
export function mahaamSubmitter(publicKey: string, endpoint = MAHAAM_FEEDBACK_ENDPOINT): SubmitFn {
  return async (payload: FeedbackPayload) => {
    const form = new FormData();
    form.append("public_key", publicKey);
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null || value === "") continue;
      if (key === "screenshot") {
        const blob = dataUrlToBlob(String(value));
        form.append(key, blob, `screenshot.${blob.type.split("/")[1] || "png"}`);
      } else if (key === "meta") {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, String(value));
      }
    }
    const res = await fetch(endpoint, { method: "POST", body: form, credentials: "omit" });
    if (!res.ok) throw new Error(`The report was not accepted (${res.status})`);
    const type = res.headers.get("content-type") ?? "";
    return type.includes("json") ? res.json() : res.text();
  };
}
