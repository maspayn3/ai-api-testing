import { create, defaults, router } from 'json-server';

const PORT = 3002;

const mockData = {
  "users": [
    { "id": 1, "name": "Test User", "email": "test@example.com" },
    { "id": 2, "name": "Another User", "email": "another@example.com" }
  ]
};

const app = create();
const jsonRouter = router(mockData);
app.use(defaults());
app.use(jsonRouter);

app.listen(PORT, () => {
  console.log(`Mock API running on http://localhost:${PORT}`);
});