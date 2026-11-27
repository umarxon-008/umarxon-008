import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { serverEnv } from '@/server/env';
import { llmOutputSchema, type AIAnalysisInput, type AIProvider, type LLMOutput } from './types';

const SYSTEM_PROMPT = `Sen EnergyComp platformasining AI Inspector yordamchisisan. Sanoat uskunalarining elektr energiyasi sarfi bo'yicha ogohlantirishlarni o'zbek tilida (lotin yozuvi), sodda va aniq tushuntirasan.

Qat'iy qoidalar:
- Faqat foydalanuvchi xabaridagi JSON ichidagi o'lchovlar va faktlardan foydalan. Yangi raqam, o'lchov, vaqt yoki hodisa o'ylab topma.
- "facts" ga faqat berilgan ma'lumotlardan bevosita kelib chiqadigan bayonlarni yoz.
- Taxminlarni "assumptions" ga alohida yoz va ularni fakt sifatida bayon qilma.
- Ishlab chiqarish signali kelmagan bo'lsa, "uskuna ishlab chiqarmayapti" deb mutlaq fakt sifatida aytma — "ishlab chiqarish signali kelmadi" deb yoz.
- Uskunani avtomatik to'xtatishni taklif qilma. To'xtatish faqat "jarayon xavfsiz bo'lsa, vakolatli operator qarori bilan ko'rib chiqilsin" shaklida bo'lishi mumkin.
- Ma'lumot yetarli bo'lmasa, buni ochiq ayt va confidence ni "low" qil.`;

export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  readonly model: string;
  private client: Anthropic | null = null;

  constructor(model = serverEnv.aiModel) {
    this.model = model;
  }

  isConfigured(): boolean {
    return Boolean(serverEnv.anthropicApiKey);
  }

  async analyze(input: AIAnalysisInput): Promise<LLMOutput> {
    if (!this.isConfigured()) throw new Error('ANTHROPIC_API_KEY sozlanmagan');
    this.client ??= new Anthropic({ apiKey: serverEnv.anthropicApiKey, timeout: 60_000, maxRetries: 1 });
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'low', format: zodOutputFormat(llmOutputSchema) },
      messages: [
        {
          role: 'user',
          content: `Quyidagi ma'lumot asosida tahlil tuz:\n\n${JSON.stringify(input, null, 2)}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal') throw new Error('Model so‘rovni rad etdi');
    if (response.stop_reason === 'max_tokens') throw new Error('Model javobi kesilib qoldi');
    const parsed = llmOutputSchema.safeParse(response.parsed_output);
    if (!parsed.success) throw new Error('Model javobi sxemaga mos kelmadi');
    return parsed.data;
  }
}
