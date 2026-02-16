export const SCHEMA_GENERATE = {
  type: 'object',
  properties: {
    messages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', maxLength: 20 },
          text: { type: 'string', maxLength: 1200 },
        },
        required: ['label', 'text'],
        additionalProperties: false,
      },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['messages'],
  additionalProperties: false,
} as const;
