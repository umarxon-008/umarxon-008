import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { listFactories, getMapLayout } from '@/server/services/factory';
import { listCategories } from '@/server/services/equipment';
import { equipmentRepo } from '@/server/repositories/equipment';
import { hasFeature } from '@/server/services/plans';
import { can } from '@/lib/permissions';
import { FactoryMap, type MapEquipment } from '@/features/factory-map/factory-map';

export const metadata: Metadata = { title: 'Factory Map' };

export default async function FactoryMapPage({ searchParams }: { searchParams: Promise<{ factory?: string; view?: string }> }) {
  const ctx = await requirePageContext();
  const { factory, view } = await searchParams;
  const factories = await listFactories(ctx.org.id);
  const current = factories.find((f) => f.id === factory) ?? factories[0]!;
  const [layout, equipment, categories, has3d] = await Promise.all([
    getMapLayout(ctx.org.id, current.id),
    equipmentRepo.list(ctx.org.id, { factoryId: current.id }),
    listCategories(ctx.org.id),
    hasFeature(ctx.org.id, 'map3d'),
  ]);
  return (
    <FactoryMap
      key={current.id}
      factories={factories.map((f) => ({ id: f.id, name: f.name }))}
      factoryId={current.id}
      initialLayout={{ width: layout.width, height: layout.height, zones: layout.zones }}
      initialEquipment={JSON.parse(JSON.stringify(equipment)) as MapEquipment[]}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      canEdit={can(ctx.role, 'map.write')}
      canAddEquipment={can(ctx.role, 'equipment.write')}
      has3d={has3d}
      initialView={view === '3d' ? '3d' : '2d'}
    />
  );
}
