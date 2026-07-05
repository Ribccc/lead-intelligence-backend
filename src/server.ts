import app from './app';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 LEAD INTELLIGENCE AI BACKEND RUNNING  `);
  console.log(`📡 URL: http://localhost:${PORT}          `);
  console.log(`🔒 Environment: Production-ready         `);
  console.log(`=========================================`);
});
