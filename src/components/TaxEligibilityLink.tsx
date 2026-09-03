import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { openTaxEligibility } from "../agentEvents";
import { useProfile } from "../hooks/useRemote";
import { useLocale } from "../state/LocaleContext";

export function TaxEligibilityLink({ children, className, onClick, completedIcon, iconFirst = false }: {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  completedIcon?: string;
  iconFirst?: boolean;
}) {
  const completed = useProfile()?.taxVerificationStatus === "VERIFIED";
  const { locale } = useLocale();
  return <Link to={completed ? "/tax/review" : "/tax"} className={className} aria-haspopup={completed ? undefined : "dialog"} onClick={(event) => {
    onClick?.(event);
    if (completed) return;
    // 새 탭 열기는 /tax 진입 경로를 사용하고 일반 클릭은 현재 화면에서 채팅방을 연다.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openTaxEligibility();
  }}>{completed ? <>{completedIcon && iconFirst ? <img src={completedIcon} alt="" /> : null}{locale === "ko" ? "검증 완료 문서 보기" : "View verified documents"}{completedIcon && !iconFirst ? <img src={completedIcon} alt="" /> : null}</> : children}</Link>;
}
