// test/setup.ts
import { Server } from 'http';
import JsonServer from 'json-server';

let server: Server;
let router: any;
let app: any;
const PORT = 3002;
export const BASE_URL = `http://localhost:${PORT}`;

// Store the original data
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

// Function to create a fresh router with original data
const createRouter = () => {
  // Create a deep copy of the original data to prevent modifications from affecting the source
  const freshData = JSON.parse(JSON.stringify(originalData));
  return JsonServer.router(freshData);
};

beforeAll((done) => {
  app = JsonServer.create();
  router = createRouter();
  app.use(JsonServer.defaults());
  app.use(router);
  server = app.listen(PORT, () => {
    console.log(`Mock API running on port ${PORT}`);
    done();
  });
});

beforeEach(() => {
  // Completely replace the router with a fresh instance
  router.db.setState(JSON.parse(JSON.stringify(originalData)));
});

afterEach(() => {
  // Ensure cleanup after each test
  router.db.setState(JSON.parse(JSON.stringify(originalData)));
});

afterAll((done) => {
  server.close(done);
});