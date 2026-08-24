"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react";
import { User } from "@/models/users/user";
import { card, label, neoBtnPrimary } from "@/lib/styles";
import { CloseButton } from "@/components/ui/close-button";
import { timeSince, UserStatus } from "@echotrace/shared";

const STATUS: UserStatus[] = [UserStatus.ACTIVE, UserStatus.BANNED];

export function UserDetailDrawer({
  user,
  onSave,
  onClose,
}: {
  user: User;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [statusForm, setStatusForm] = useState<UserStatus>(user.isDelete ? "banned" : "active");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 bg-[#F8F2E5] flex flex-col overflow-hidden border-l-[3px] border-[#222]"
        style={{ width: 420 }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b-[3px] border-[#222]">
          <div>
            <p className={`${label} mb-1 text-[#666]`}>{t("admin.users.label")}</p>
            <h2 className="text-xl font-bold truncate max-w-[300px]">{user.name}</h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {/* Status */}
          <div className="px-6 py-5 border-b-[3px] border-[#222]">
            <h3 className="text-sm text-[#666] mb-3">{t("admin.users.status")}</h3>
            <div className="flex gap-2">
              {STATUS.map((s) => {
                const active = statusForm === s;
                const meta = s === "active" ? { bg: "#D4EDDA", text: "#155724" } : { bg: "#F8D7DA", text: "#721C24" };
                return (
                  <button
                    key={s}
                    onClick={() => {
                      if (user.role === "admin") return;
                      setStatusForm(s);
                    }}
                    className={`font-mono text-[9px] font-bold tracking-widest uppercase leading-none rounded-[6px] px-2.5 py-1.5 border-2 transition-[opacity,border-color] ${
                      active
                        ? "border-[#222] shadow-[2px_2px_0_#222] opacity-100"
                        : "border-transparent opacity-40 hover:opacity-70"
                    }`}
                    style={{ background: meta.bg, color: meta.text }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* General info */}
          <div className="px-6 py-5 space-y-4">
            <h3 className="text-sm text-[#666] mb-3">{t("admin.users.general")}</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className={`${card} px-3 py-1.5`}>
                <p className={`${label} text-[#999]`}>{t("admin.users.joined")}</p>
                <p className="text-sm font-bold">{user.createdAt ? timeSince(user.createdAt) : "—"}</p>
              </div>
            </div>
            {[
              [t("admin.users.name"), user.name],
              [t("admin.users.email"), user.email],
              [t("admin.users.phone"), user.phone],
              [t("admin.users.address"), user.address],
              [t("admin.users.city"), user.city],
              [t("admin.users.role"), user.role],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="font-mono text-[9px] font-bold mb-0.5 text-[#999]">{k as string}</p>
                <p className="text-sm font-bold">{v || "—"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 shrink-0 border-t-[3px] border-[#222]">
          <button
            onClick={onSave}
            className={`${neoBtnPrimary} w-full flex items-center justify-center gap-2 py-3 ${
              user.role === "admin" ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            <Save size={16} /> {t("common.save")}
          </button>
        </div>
      </div>
    </>
  );
}
