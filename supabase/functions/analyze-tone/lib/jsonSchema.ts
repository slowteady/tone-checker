export const TONE_CHECKER_V2_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overall_score', 'summary', 'category_scores', 'signals', 'suggestions', 'warnings'],
  properties: {
    overall_score: { type: 'integer', minimum: 0, maximum: 100 },
    summary: { type: 'string', minLength: 1, maxLength: 50 },

    category_scores: {
      type: 'object',
      additionalProperties: false,
      required: ['emotion_attitude', 'politeness_respect', 'conflict_safety', 'clarity_delivery', 'context_fit'],
      properties: {
        emotion_attitude: { $ref: '#/$defs/category_emotion_attitude' },
        politeness_respect: { $ref: '#/$defs/category_politeness_respect' },
        conflict_safety: { $ref: '#/$defs/category_conflict_safety' },
        clarity_delivery: { $ref: '#/$defs/category_clarity_delivery' },
        context_fit: { $ref: '#/$defs/category_context_fit' },
      },
    },

    signals: { type: 'array', minItems: 0, maxItems: 3, items: { $ref: '#/$defs/signal' } },
    suggestions: { type: 'array', minItems: 3, maxItems: 3, items: { $ref: '#/$defs/suggestion' } },

    warnings: {
      type: 'array',
      minItems: 0,
      maxItems: 3,
      items: { type: 'string', minLength: 1, maxLength: 50 },
    },
  },

  $defs: {
    score_0_100: { type: 'integer', minimum: 0, maximum: 100 },
    short_comment_50: { type: 'string', minLength: 1, maxLength: 50 },

    detail_item: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'comment'],
      properties: {
        score: { $ref: '#/$defs/score_0_100' },
        comment: { $ref: '#/$defs/short_comment_50' },
      },
    },

    // ✅ 공통 "category shape"를 $ref로 재사용하고 싶으면 아래처럼 두고,
    // 각 category에서 details만 구체화해도 되지만, (allOf 없이)
    // JSON Schema에서 "오브젝트 합성"이 필요해져서 결국 oneOf/anyOf/allOf로 돌아가게 됨.
    // 그래서 여기서는 각 category를 완전 전개(full expand) 해놨어.

    category_emotion_attitude: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'comment', 'details'],
      properties: {
        score: { $ref: '#/$defs/score_0_100' },
        comment: { $ref: '#/$defs/short_comment_50' },
        details: {
          type: 'object',
          additionalProperties: false,
          required: ['warmth_empathy', 'emotional_stability'],
          properties: {
            warmth_empathy: { $ref: '#/$defs/detail_item' },
            emotional_stability: { $ref: '#/$defs/detail_item' },
          },
        },
      },
    },

    category_politeness_respect: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'comment', 'details'],
      properties: {
        score: { $ref: '#/$defs/score_0_100' },
        comment: { $ref: '#/$defs/short_comment_50' },
        details: {
          type: 'object',
          additionalProperties: false,
          required: ['politeness', 'softness'],
          properties: {
            politeness: { $ref: '#/$defs/detail_item' },
            softness: { $ref: '#/$defs/detail_item' },
          },
        },
      },
    },

    category_conflict_safety: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'comment', 'details'],
      properties: {
        score: { $ref: '#/$defs/score_0_100' },
        comment: { $ref: '#/$defs/short_comment_50' },
        details: {
          type: 'object',
          additionalProperties: false,
          required: ['non_aggressive', 'conflict_mitigation'],
          properties: {
            non_aggressive: { $ref: '#/$defs/detail_item' },
            conflict_mitigation: { $ref: '#/$defs/detail_item' },
          },
        },
      },
    },

    category_clarity_delivery: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'comment', 'details'],
      properties: {
        score: { $ref: '#/$defs/score_0_100' },
        comment: { $ref: '#/$defs/short_comment_50' },
        details: {
          type: 'object',
          additionalProperties: false,
          required: ['clarity', 'actionability'],
          properties: {
            clarity: { $ref: '#/$defs/detail_item' },
            actionability: { $ref: '#/$defs/detail_item' },
          },
        },
      },
    },

    category_context_fit: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'comment', 'details'],
      properties: {
        score: { $ref: '#/$defs/score_0_100' },
        comment: { $ref: '#/$defs/short_comment_50' },
        details: {
          type: 'object',
          additionalProperties: false,
          required: ['formality_fit', 'low_misinterpretation_risk'],
          properties: {
            formality_fit: { $ref: '#/$defs/detail_item' },
            low_misinterpretation_risk: { $ref: '#/$defs/detail_item' },
          },
        },
      },
    },

    signal: {
      type: 'object',
      additionalProperties: false,
      required: ['category', 'sub_category', 'level', 'reason', 'evidence'],
      properties: {
        category: {
          type: 'string',
          enum: ['emotion_attitude', 'politeness_respect', 'conflict_safety', 'clarity_delivery', 'context_fit'],
        },
        sub_category: {
          type: 'string',
          enum: [
            'warmth_empathy',
            'emotional_stability',
            'politeness',
            'softness',
            'non_aggressive',
            'conflict_mitigation',
            'clarity',
            'actionability',
            'formality_fit',
            'low_misinterpretation_risk',
          ],
        },
        level: { type: 'string', enum: ['low', 'medium', 'high'] },
        reason: { type: 'string', minLength: 1, maxLength: 60 },
        evidence: { type: 'string', minLength: 1, maxLength: 60 },
      },
    },

    suggestion: {
      type: 'object',
      additionalProperties: false,
      required: ['label', 'description', 'example'],
      properties: {
        label: { type: 'string', minLength: 1, maxLength: 20 },
        description: { type: 'string', minLength: 1, maxLength: 50 },
        example: { type: 'string', minLength: 1, maxLength: 1000 },
      },
    },
  },
} as const;
