import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route Imports
import authRouter from './modules/auth/auth.routes';
import workspaceRouter from './modules/workspaces/workspaces.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import leadRouter from './modules/leads/leads.routes';
import pipelineRouter from './modules/pipelines/pipelines.routes';
import campaignRouter from './modules/campaigns/campaigns.routes';
import integrationRouter from './modules/integrations/integrations.routes';

import prisma from './core/prisma';

dotenv.config();

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base routes mapping
app.get('/health', async (req, res) => {
  try {
    // Perform database verification query
    await prisma.workspace.count();
    res.json({
      status: 'Operational',
      dbConnection: 'Successful',
      timestamp: new Date(),
      service: 'Lead Intelligence AI API Services'
    });
  } catch (error) {
    res.status(500).json({
      status: 'Degraded',
      dbConnection: 'Failed',
      timestamp: new Date(),
      service: 'Lead Intelligence AI API Services'
    });
  }
});

// Modular Routes API versioning
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/workspaces', workspaceRouter);
app.use('/api/v1/dashboards', dashboardRouter);
app.use('/api/v1/leads', leadRouter);
app.use('/api/v1/pipelines', pipelineRouter);
app.use('/api/v1/campaigns', campaignRouter);
app.use('/api/v1/integrations', integrationRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

export default app;
