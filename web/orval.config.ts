import { defineConfig } from 'orval';

export default defineConfig({
  watchroom: {
    input: '../typespec/tsp-output/@typespec/openapi3/openapi.yaml',
    output: {
      target: './src/generated-client/watchRoomApi.ts',
      schemas: './src/generated-client/watchRoomApi.schemas.ts',
      client: 'react-query',
      mode: 'split',
      override: {
        mutator: {
          path: './src/lib/api.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
