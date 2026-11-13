import { useEffect, useState } from 'react';
import { FolderOpen, Moon, RotateCcw, Sun } from 'lucide-react';
import type { AppInfo, Theme } from '@shared/ipc';
import { PageHeader } from '../components/PageHeader';
import { ErrorState, LoadingState } from '../components/StateViews';
import { useSettings } from '../store/settings';
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
              <dt>Ma’lumotlar papkasi</dt>
              <dd className="mono">{info.dataDirectory}</dd>
              <dt>Ma’lumotlar bazasi</dt>
              <dd className="mono">{info.databaseFile}</dd>
            </dl>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => void window.marius.logs.openFolder()}
            >
              <FolderOpen size={16} aria-hidden="true" />
              Log papkasini ochish
            </button>
          </>
        )}
      </section>
    </div>
  );
}
