// test/setup.ts
import { Server } from 'http';
import { create, defaults, router } from 'json-server';

let server: Server;
let jsonRouter: any;
let app: any;
const PORT = 3002;
export const BASE_URL = `http://localhost:${PORT}`;

const originalData = {
  "users": [
    { "id": 1, "name": "Test User", "email": "test@example.com" },
    { "id": 2, "name": "Another User", "email": "another@example.com" }
  ],
  "posts": [
    { 
      "id": 1, 
      "title": "Test Post",
      "body": "This is a test post",
      "userId": 1
    }
  ],
  "comments": [
    {
      "id": 1,
      "postId": 1,
      "body": "Test comment",
      "email": "test@example.com"
    }
  ]
};

const createRouter = () => {
  const freshData = JSON.parse(JSON.stringify(originalData));
  return router(freshData);
};

beforeAll((done) => {
  app = create();
  jsonRouter = createRouter();
  app.use(defaults());
  app.use(jsonRouter);
  server = app.listen(PORT, () => {
    console.log(`Mock API running on port ${PORT}`);
    done();
  });
});

beforeEach(() => {
  jsonRouter.db.setState(JSON.parse(JSON.stringify(originalData)));
});

afterEach(() => {
  jsonRouter.db.setState(JSON.parse(JSON.stringify(originalData)));
});

afterAll((done) => {
  server.close(done);
});