import { Request, Response } from 'express';
import { DashboardService } from '../../../application/services/DashboardService';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  getDashboardStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.dashboardService.getDashboardStats();
      res.json({ status: 'success', data: stats });
    } catch (error) {
      console.error('Dashboard Stats Error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch dashboard statistics' 
      });
    }
  };

  getRecentActivities = async (req: Request, res: Response) => {
    try {
      const activities = await this.dashboardService.getRecentActivities();
      res.json({ status: 'success', data: activities });
    } catch (error) {
      console.error('Recent Activities Error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch recent activities' 
      });
    }
  };

  getProcurementTrends = async (req: Request, res: Response) => {
    try {
      const trends = await this.dashboardService.getProcurementTrends();
      res.json({ status: 'success', data: trends });
    } catch (error) {
      console.error('Procurement Trends Error:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch procurement trends' 
      });
    }
  };

  getOffersByStatus = async (req: Request, res: Response) => {
    try {
      const offersByStatus = await this.dashboardService.getOffersByStatus();
      res.json({ status: 'success', data: offersByStatus });
    } catch (error) {
      console.error('Offers By Status Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch offers by status'
      });
    }
  };

  getDispatchDueMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = await this.dashboardService.getDispatchDueMetrics();
      res.json({ status: 'success', data: metrics });
    } catch (error) {
      console.error('Dispatch Due Metrics Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch dispatch due metrics'
      });
    }
  };

  getProcessingTimeMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = await this.dashboardService.getProcessingTimeMetrics();
      res.json({ status: 'success', data: metrics });
    } catch (error) {
      console.error('Processing Time Metrics Error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch processing time metrics'
      });
    }
  };
}