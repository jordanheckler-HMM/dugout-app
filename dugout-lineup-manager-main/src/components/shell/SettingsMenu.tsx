import { ReactNode, useEffect } from "react";
import { useTheme } from "next-themes";
import { X } from "lucide-react";
import { TextSize } from "@/lib/appearance";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
] as const;

const TEXT_SIZES: { id: TextSize; label: string }[] = [
  { id: "small", label: "Small" },
  { id: "default", label: "Default" },
  { id: "large", label: "Large" },
];

function Choice({
  checked,
  label,
  onSelect,
}: {
  checked: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn("corner-choice", checked && "corner-choice-selected")}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}

function AppearanceSection({
  textSize,
  setTextSize,
}: {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}) {
  const { theme, setTheme } = useTheme();
  const selectedTheme = theme ?? "system";

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="corner-kicker" id="settings-theme-label">Theme</p>
        <div className="corner-choices" role="radiogroup" aria-labelledby="settings-theme-label">
          {THEMES.map((option) => (
            <Choice
              key={option.id}
              label={option.label}
              checked={selectedTheme === option.id}
              onSelect={() => setTheme(option.id)}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="corner-kicker" id="settings-text-label">Text size</p>
        <div className="corner-choices" role="radiogroup" aria-labelledby="settings-text-label">
          {TEXT_SIZES.map((option) => (
            <Choice
              key={option.id}
              label={option.label}
              checked={textSize === option.id}
              onSelect={() => setTextSize(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface SettingsSection {
  id: string;
  title: string;
  render: (appearance: { textSize: TextSize; setTextSize: (size: TextSize) => void }) => ReactNode;
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "appearance",
    title: "Appearance",
    render: ({ textSize, setTextSize }) => <AppearanceSection textSize={textSize} setTextSize={setTextSize} />,
  },
];

export function SettingsMenu({
  onClose,
  textSize,
  setTextSize,
}: {
  onClose: () => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}) {
  useEffect(() => {
    const close = document.getElementById("settings-close");
    close?.focus();
  }, []);

  return (
    <div id="settings-popover" className="corner-card" role="dialog" aria-label="Settings">
      <div className="corner-card-head">
        <span className="diamond-mark" aria-hidden />
        <strong>Settings</strong>
        <button id="settings-close" type="button" className="corner-dismiss" aria-label="Close settings" onClick={onClose}>
          <X />
        </button>
      </div>
      {SETTINGS_SECTIONS.map((section) => (
        <section key={section.id} className="corner-section" aria-labelledby={`settings-${section.id}`}>
          <h2 id={`settings-${section.id}`} className="corner-section-title">{section.title}</h2>
          {section.render({ textSize, setTextSize })}
        </section>
      ))}
    </div>
  );
}
