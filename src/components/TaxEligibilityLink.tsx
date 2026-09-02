import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { openTaxEligibility } from "../agentEvents";

export function TaxEligibilityLink({ children, className, onClick }: {
  children: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return <Link to="/tax" className={className} aria-haspopup="dialog" onClick={(event) => {
    onClick?.(event);
    // 새 탭 열기는 /tax 진입 경로를 사용하고 일반 클릭은 현재 화면에서 채팅방을 연다.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openTaxEligibility();
  }}>{children}</Link>;
}
