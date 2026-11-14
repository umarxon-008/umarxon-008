import { useEffect, useState } from 'react';
import { FolderOpen, Moon, RotateCcw, Sun } from 'lucide-react';
import type { AppInfo, Theme } from '@shared/ipc';
import { PageHeader } from '../components/PageHeader';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useSettings } from '../store/settings';
import { AiSettingsSection } from '../features/settings/AiSettingsSection';
import { PrivacySection } from '../features/settings/PrivacySection';
import { VoiceSettingsSection } from '../features/settings/VoiceSettingsSection';
import { InternetSection } from '../features/settings/InternetSection';
import { ObsidianSection } from '../features/settings/ObsidianSection';
import { BackupControls } from '../features/settings/BackupControls';
import { uz } from '../i18n/uz';

const themes: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: 'dark', label: 'Qorong‘i', icon: Moon },
  { value: 'light', label: 'Yorug‘', icon: Sun },
];

export function SettingsPage() {
  const { settings, update, error } = useSettings();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);

  useEffect(() => {
    void window.marius.app.getInfo().then((r) => {
      if (r.ok) setInfo(r.data);
      else setInfoError(r.error.message);
    });
  }, []);

  if (!settings) return <LoadingState />;

  return (
    <div className="page">
      <PageHeader title={uz.nav.settings} subtitle="Sozlamalar shu kompyuterda saqlanadi." />

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <AiSettingsSection />

      <VoiceSettingsSection />

      <InternetSection />

      <ObsidianSection />

      <section className="card settings-section" aria-labelledby="appearance-title">
        <h2 id="appearance-title">Ko‘rinish</h2>

        <fieldset className="field">
          <legend>Mavzu</legend>
          <div className="segmented" role="radiogroup">
            {themes.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`segmented__option${settings.theme === value ? ' is-active' : ''}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={settings.theme === value}
                  onChange={() => void update({ theme: value })}
                />
                <Icon size={16} aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => void update({ reducedMotion: e.target.checked })}
          />
          <span className="toggle__track" aria-hidden="true" />
          <span>
            <strong>Harakatni kamaytirish</strong>
            <small>Animatsiyalar o‘chiriladi.</small>
          </span>
        </label>
      </section>

      <section className="card settings-section" aria-labelledby="general-title">
        <h2 id="general-title">Umumiy</h2>
        <div className="row">
          <div>
            <strong>Til</strong>
            <small>O‘zbek tili (lotin). Boshqa tillar keyinroq qo‘shiladi.</small>
          </div>
        </div>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.minimizeToTray}
            onChange={(e) => void update({ minimizeToTray: e.target.checked })}
          />
          <span className="toggle__track" aria-hidden="true" />
          <span>
            <strong>Yopilganda tray’da qolish</strong>
            <small>
              Oynani yopsangiz MARIUS fonda qoladi va eslatmalar vaqtida chiqadi. Chiqish: tray menyusidan.
            </small>
          </span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.launchAtLogin}
            onChange={(e) => void update({ launchAtLogin: e.target.checked })}
          />
          <span className="toggle__track" aria-hidden="true" />
          <span>
            <strong>Windows bilan birga ishga tushish</strong>
            <small>
              Kompyuter yoqilganda MARIUS avtomatik ochiladi (tray yoqilgan bo‘lsa, fonda). Faqat o‘rnatilgan
              ilovada ishlaydi.
            </small>
          </span>
        </label>
        <div className="row">
          <div>
            <strong>Tanishuv oynasi</strong>
            <small>Boshlang‘ich sozlash oynasini qayta ko‘rsatish.</small>
          </div>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => void update({ onboardingCompleted: false })}
          >
            <RotateCcw size={16} aria-hidden="true" />
            Qayta ochish
          </button>
        </div>
      </section>

      <PrivacySection />

      <section className="card settings-section" aria-labelledby="about-title">
        <h2 id="about-title">Dastur haqida</h2>
        {infoError && <ErrorState message={infoError} />}
        {!info && !infoError && <LoadingState />}
        {info && (
          <>
            <dl className="info-list">
              <dt>Versiya</dt>
              <dd>{info.version}</dd>
              <dt>Tizim</dt>
              <dd>{info.platform}</dd>
              <dt>Electron</dt>
              <dd>{info.electron}</dd>
            </dl>
            <h3 className="settings-subtitle">Ma’lumotlar qayerda saqlanadi?</h3>
            <p className="muted">
              Barcha ma’lumotlar faqat shu kompyuterda saqlanadi. Hech narsa cloud’ga yuborilmaydi.
            </p>
            <dl className="info-list">
              <dt>Ma’lumotlar papkasi</dt>
              <dd className="mono">{info.dataDirectory}</dd>
              <dt>Ma’lumotlar bazasi</dt>
              <dd className="mono">{info.databaseFile}</dd>
              <dt>Loglar</dt>
              <dd className="mono">{info.logDirectory}</dd>
            </dl>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void window.marius.logs.openFolder()}
            >
              <FolderOpen size={16} aria-hidden="true" />
              Log papkasini ochish
            </button>
            <BackupControls />
          </>
        )}
      </section>
    </div>
  );
}
