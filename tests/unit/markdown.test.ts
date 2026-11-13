import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, plainPreview } from '../../src/renderer/src/lib/markdown';

describe('markdown parser', () => {
  it('kod bloki, sarlavha, ro‘yxat va paragraf', () => {
    const blocks = parseMarkdown(
      '# C++ sikllari\n\nMana misol:\n```cpp\nfor (int i = 0; i < 3; i++) {}\n```\n- birinchi\n- **ikkinchi**\n\n1. bir\n2. ikki',
    );
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'code', 'list', 'list']);
    expect(blocks[2]).toEqual({ type: 'code', lang: 'cpp', text: 'for (int i = 0; i < 3; i++) {}' });
    expect(blocks[3]).toMatchObject({ ordered: false });
    expect(blocks[4]).toMatchObject({ ordered: true });
  });

  it('inline: kod, qalin, kursiv', () => {
    expect(parseInline('a `x` **b** *c*')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'code', text: 'x' },
      { type: 'text', text: ' ' },
      { type: 'bold', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'italic', children: [{ type: 'text', text: 'c' }] },
    ]);
  });

  it('HTML matn sifatida qoladi (bajarilmaydi)', () => {
    const blocks = parseMarkdown('<img src=x onerror=alert(1)>');
    expect(blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: '<img src=x onerror=alert(1)>' }] },
    ]);
  });

  it('yopilmagan kod bloki (oqim paytida) buzilmaydi', () => {
    expect(parseMarkdown('```js\nconst a = 1;')).toEqual([
      { type: 'code', lang: 'js', text: 'const a = 1;' },
    ]);
  });
});

describe('plainPreview', () => {
  it('Markdown belgilarini olib tashlaydi', () => {
    expect(plainPreview('C++ da **for** sikli.\n```cpp\nfor(;;){}\n```\n1. `i`')).toBe(
      'C++ da for sikli. [kod] 1. i',
    );
    expect(plainPreview('a'.repeat(300))).toHaveLength(140);
  });
});
