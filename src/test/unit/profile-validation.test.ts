import { describe, expect, it } from 'vitest';
import { validateProfileJson } from '@/lib/validation';

const VALID_JSON = {
  $schema: '5genSearch-profile-v1',
  name: 'My DS Lite - Black',
  data: {
    config: {
      mac: [0, 9, 191, 42, 78, 210],
      hardware: 'DsLite',
      version: 'Black',
      region: 'Jpn',
    },
    ranges: [{ timer0_min: 3193, timer0_max: 3194, vcount_min: 96, vcount_max: 96 }],
    timer0Auto: true,
    gameStart: {
      start_mode: 'Continue',
      save: 'WithSave',
      memory_link: 'Disabled',
      shiny_charm: 'NotObtained',
    },
    tid: 12_345,
    sid: 54_321,
  },
};

describe('validateProfileJson', () => {
  it('正常な JSON がパースされ ProfileData が返る', () => {
    const result = validateProfileJson(VALID_JSON);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.name).toBe('My DS Lite - Black');
      expect(result.data.config.hardware).toBe('DsLite');
      expect(result.data.tid).toBe(12_345);
      expect(result.data.sid).toBe(54_321);
    }
  });

  it('tid/sid が undefined でも正常', () => {
    const json = {
      ...VALID_JSON,
      data: { ...VALID_JSON.data, tid: undefined, sid: undefined },
    };
    const result = validateProfileJson(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tid).toBeUndefined();
      expect(result.data.sid).toBeUndefined();
    }
  });

  it('tid/sid が JSON の null でも undefined として正常', () => {
    // JSON.parse は null を生成し得る — 境界で undefined に正規化されることを検証
    const raw = JSON.stringify({
      ...VALID_JSON,
      // eslint-disable-next-line unicorn/no-null -- JSON boundary test: null is the expected input from JSON.parse
      data: { ...VALID_JSON.data, tid: null, sid: null },
    });
    const parsed: unknown = JSON.parse(raw);
    const result = validateProfileJson(parsed);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tid).toBeUndefined();
      expect(result.data.sid).toBeUndefined();
    }
  });

  it('$schema が異なる場合エラー', () => {
    const json = { ...VALID_JSON, $schema: 'wrong' };
    const result = validateProfileJson(json);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('$schema');
    }
  });

  it('ルートがオブジェクトでない場合エラー', () => {
    const result = validateProfileJson('not an object');
    expect(result.ok).toBe(false);
  });

  it('name が空文字の場合エラー', () => {
    const json = { ...VALID_JSON, name: '' };
    const result = validateProfileJson(json);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('name');
    }
  });

  describe('MAC アドレスバリデーション', () => {
    it('6 要素でない配列はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: {
          ...VALID_JSON.data,
          config: { ...VALID_JSON.data.config, mac: [0, 1, 2] },
        },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('mac');
      }
    });

    it('範囲外の値はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: {
          ...VALID_JSON.data,
          config: { ...VALID_JSON.data.config, mac: [0, 0, 0, 0, 0, 256] },
        },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('mac');
      }
    });
  });

  describe('列挙値バリデーション', () => {
    it('不正な Hardware はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: {
          ...VALID_JSON.data,
          config: { ...VALID_JSON.data.config, hardware: 'GameBoy' },
        },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('hardware');
      }
    });

    it('不正な Version はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: {
          ...VALID_JSON.data,
          config: { ...VALID_JSON.data.config, version: 'Ruby' },
        },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('version');
      }
    });

    it('不正な Region はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: {
          ...VALID_JSON.data,
          config: { ...VALID_JSON.data.config, region: 'Chn' },
        },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('region');
      }
    });

    it('不正な start_mode はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: {
          ...VALID_JSON.data,
          gameStart: { ...VALID_JSON.data.gameStart, start_mode: 'Run' },
        },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('start_mode');
      }
    });
  });

  describe('フィールド欠損', () => {
    it('data がない場合エラー', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to remove data field
      const { data: _unusedData, ...rest } = VALID_JSON;
      const result = validateProfileJson({ ...rest, $schema: '5genSearch-profile-v1' });
      expect(result.ok).toBe(false);
    });

    it('ranges が空配列の場合エラー', () => {
      const json = {
        ...VALID_JSON,
        data: { ...VALID_JSON.data, ranges: [] },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('ranges');
      }
    });
  });

  describe('TID/SID 範囲バリデーション', () => {
    it('TID が 65536 以上はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: { ...VALID_JSON.data, tid: 65_536 },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('tid');
      }
    });

    it('SID が負値はエラー', () => {
      const json = {
        ...VALID_JSON,
        data: { ...VALID_JSON.data, sid: -1 },
      };
      const result = validateProfileJson(json);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('sid');
      }
    });
  });
});
