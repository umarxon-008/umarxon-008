import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import type { Reminder } from '@shared/ipc';

/** Eslatma vaqti keldi: ilova ichidagi xabar (Windows bildirishnomalari o'chiq bo'lsa ham ko'rinadi). */
export function ReminderToast() {
  const [items, setItems] = useState<{ reminder: Reminder; missed: boolean }[]>([]);

  useEffect(
    () =>
      window.marius.reminders.onEvent((e) => {
        if (e.type === 'fired') setItems((prev) => [...prev, { reminder: e.reminder, missed: e.missed }]);
      }),
    [],
  );

  if (!items.length) return null;
  const dismiss = (id: string) => setItems((prev) => prev.filter((i) => i.reminder.id !== id));

  return (
    <div className="toasts" role="region" aria-label="Eslatmalar">
      {items.map(({ reminder, missed }) => (
        <div key={reminder.id} className="toast" role="alert">
          <Bell size={18} aria-hidden="true" />
          <div>
            <strong>{missed ? 'O‘tkazib yuborilgan eslatma' : 'Eslatma'}</strong>
            <p>{reminder.title}</p>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() =>
              void window.marius.reminders.setStatus(reminder.id, 'done').then(() => dismiss(reminder.id))
            }
          >
            Bajarildi
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            onClick={() => dismiss(reminder.id)}
            aria-label="Yopish"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
