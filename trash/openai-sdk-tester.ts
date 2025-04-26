import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

client.chat.completions.create({
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'test' },
        {
          type: 'file',
          file: {
            file_data: 'fileData',
          },
        },
        {
          type: 'image_url',
          image_url: {},
        },
      ],
    },
  ],
  stream: true,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'schema',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          age: {
            type: 'integer',
          },
        },
        required: ['name', 'age'],
      },
    },
  },
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
});
