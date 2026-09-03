import { useLocale } from "../state/LocaleContext";
import { originalSourceUrl } from "../utils/originalSourceUrl";

export function OpenOriginalLink({ url }: { url: string | null | undefined }) {
  const { t } = useLocale();
  const href = originalSourceUrl(url);
  if (!href) return null;
  return <a className="open-original-link" href={href} target="_blank" rel="noopener noreferrer">
    <img src="/assets/external-link.svg" alt="" />
    {t("openOriginal")}
  </a>;
}
