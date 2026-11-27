'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/** Ekranga kirganda yumshoq paydo bo'ladi. JS o'chiq bo'lsa ham kontent ko'rinadi (noscript holatda klass qo'shilmaydi). */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('ec-reveal');
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cn(className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
