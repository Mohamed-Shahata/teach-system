import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { isSupportedLocale } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isSupportedLocale(requested) ? requested : undefined;

  if (!locale) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
