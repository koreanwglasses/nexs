import nexs from "@koreanwglasses/nexs-server";

// Create app
const app = nexs({ dev: process.env.NODE_ENV === "development" });

// Add any initialization (e.g. connect to db, add listeners, run
// background processes, etc. here)

app.listen(3000, () => {
  console.log(`> Ready on http://localhost:3000`);
});
