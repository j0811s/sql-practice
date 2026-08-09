import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="status">
      <span>更新があります</span>
      <button type="button" className="update-banner__button" onClick={() => updateServiceWorker(true)}>
        再読み込み
      </button>
    </div>
  );
}
