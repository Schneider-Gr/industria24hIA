"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";

// Upload real pro bucket 'marketplace' (migration 0054, admin-only) em vez
// de colar URL manual. Mesmo padrão do ImageUpload usado em seller/lojas e
// seller/produtos, só troca bucket + pathPrefix.
export function MarketplaceBannerForm({
  action,
  bannerDesktopUrl,
  bannerMobileUrl,
}: {
  action: (formData: FormData) => void | Promise<void>;
  bannerDesktopUrl: string;
  bannerMobileUrl: string;
}) {
  const [desktopUrl, setDesktopUrl] = useState(bannerDesktopUrl);
  const [mobileUrl, setMobileUrl] = useState(bannerMobileUrl);

  return (
    <form action={action} className="space-y-6">
      <div>
        <span className="mb-1 block text-sm font-medium">
          Banner desktop — 1460×482
        </span>
        <input type="hidden" name="banner_desktop_url" value={desktopUrl} />
        <ImageUpload
          bucket="marketplace"
          pathPrefix="home"
          currentUrl={desktopUrl}
          label="banner desktop"
          onUploaded={setDesktopUrl}
        />
      </div>
      <div>
        <span className="mb-1 block text-sm font-medium">
          Banner mobile — 892×817
        </span>
        <input type="hidden" name="banner_mobile_url" value={mobileUrl} />
        <ImageUpload
          bucket="marketplace"
          pathPrefix="home"
          currentUrl={mobileUrl}
          label="banner mobile"
          onUploaded={setMobileUrl}
        />
      </div>
      <button
        type="submit"
        className="rounded bg-laranja px-4 py-2 text-sm font-semibold text-white hover:bg-laranja-escuro"
      >
        Salvar
      </button>
    </form>
  );
}
