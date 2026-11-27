import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { aiFeedbackSchema } from '@/schemas/alerts';
import { setAnalysisFeedback } from '@/server/services/inspector';

export const POST = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('ai.feedback');
  const { feedback } = await parseJson(req, aiFeedbackSchema);
  return ok(await setAnalysisFeedback(ctx, id, feedback));
});
