import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, addDays, differenceInDays } from 'date-fns';

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  async getDashboardStats() {
    const currentDate = new Date();
    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);
    const startOfPreviousMonth = startOfMonth(subMonths(currentDate, 1));
    const endOfPreviousMonth = endOfMonth(subMonths(currentDate, 1));

    // Get current month stats
    const [
      currentMonthOffers,
      currentMonthPOs,
      offerStatusCounts,
      totalOffers,
      totalPOs
    ] = await Promise.all([
      // Count current month offers
      this.prisma.budgetaryOffer.count({
        where: {
          createdAt: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),
      // Count current month POs
      this.prisma.purchaseOrder.count({
        where: {
          createdAt: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),
      // Get offer status distribution
      this.prisma.budgetaryOffer.groupBy({
        by: ['status'],
        _count: true
      }),
      // Get total offers (all time)
      this.prisma.budgetaryOffer.count(),
      // Get total POs (all time)
      this.prisma.purchaseOrder.count()
    ]);

    // Get previous month stats for trend calculation
    const [previousMonthOffers, previousMonthPOs] = await Promise.all([
      this.prisma.budgetaryOffer.count({
        where: {
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth
          }
        }
      }),
      this.prisma.purchaseOrder.count({
        where: {
          createdAt: {
            gte: startOfPreviousMonth,
            lte: endOfPreviousMonth
          }
        }
      })
    ]);

    // Calculate trends (percentage change)
    const offersTrend = previousMonthOffers === 0 ? 100 : 
      ((currentMonthOffers - previousMonthOffers) / previousMonthOffers) * 100;
    const ordersTrend = previousMonthPOs === 0 ? 100 : 
      ((currentMonthPOs - previousMonthPOs) / previousMonthPOs) * 100;

    // Get average processing time for POs (in days)
    const processingTimeResult = await this.prisma.$queryRaw<{ avgProcessingTime: number }[]>`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400) as avgProcessingTime
      FROM "PurchaseOrder"
      WHERE status = 'APPROVED'
    `;
    
    const avgProcessingTime = processingTimeResult[0]?.avgProcessingTime || 0;

    return {
      totalOffers,
      totalOrders: totalPOs,
      offersTrend: Math.round(offersTrend),
      ordersTrend: Math.round(ordersTrend),
      processingTime: Math.round(avgProcessingTime * 10) / 10, // Round to 1 decimal place
      processingTimeTrend: -12, // Hardcoded for now, would need historical data to calculate
      offerStatus: offerStatusCounts.map(status => ({
        name: status.status,
        value: status._count,
        color: this.getStatusColor(status.status)
      }))
    };
  }

  async getRecentActivities() {
    const activities = await Promise.all([
      // Get recent offers with more details
      this.prisma.budgetaryOffer.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          offerId: true,
          subject: true,
          status: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true
            }
          }
        }
      }),
      // Get recent POs with more details
      this.prisma.purchaseOrder.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          poNumber: true,
          status: true,
          createdAt: true,
          totalAmount: true,
          vendor: {
            select: {
              name: true
            }
          },
          site: {
            select: {
              name: true
            }
          },
          createdBy: {
            select: {
              name: true
            }
          }
        }
      })
    ]);
    
    return this.processActivities(activities);
  }

  async getProcurementTrends() {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
        month: date.toLocaleString('default', { month: 'short' })
      };
    }).reverse();

    const trends = await Promise.all(
      last12Months.map(async ({ start, end, month }) => {
        const [offers, orders] = await Promise.all([
          this.prisma.budgetaryOffer.count({
            where: {
              createdAt: {
                gte: start,
                lte: end
              }
            }
          }),
          this.prisma.purchaseOrder.count({
            where: {
              createdAt: {
                gte: start,
                lte: end
              }
            }
          })
        ]);

        return {
          month,
          offers,
          orders
        };
      })
    );

    return trends;
  }

  private getStatusColor(status: string): string {
    const colors = {
      DRAFT: '#9CA3AF',
      PENDING_APPROVAL: '#FCD34D',
      APPROVED: '#34D399',
      REJECTED: '#EF4444'
    };
    return colors[status as keyof typeof colors] || '#9CA3AF';
  }

  private processActivities([offers, pos]: any[]) {
    const activities = [
      ...offers.map((offer: any) => ({
        id: offer.id,
        type: 'offer',
        title: `Budgetary Offer ${offer.offerId}`,
        description: offer.subject ? 
          `${offer.subject.substring(0, 40)}${offer.subject.length > 40 ? '...' : ''}` : 
          `Created by ${offer.createdBy?.name || 'Unknown'}`,
        timestamp: offer.createdAt,
        status: offer.status,
        createdBy: offer.createdBy?.name
      })),
      ...pos.map((po: any) => ({
        id: po.id,
        type: 'po',
        title: `Purchase Order ${po.poNumber}`,
        description: po.vendor ? 
          `${po.totalAmount ? this.formatCurrency(po.totalAmount) : ''} - ${po.vendor.name}${po.site ? ` - ${po.site.name}` : ''}` : 
          `Created by ${po.createdBy?.name || 'Unknown'}`,
        timestamp: po.createdAt,
        status: po.status,
        createdBy: po.createdBy?.name,
        amount: po.totalAmount
      }))
    ];

    // Sort by most recent first
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  // Format currency for display
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }

  async getOffersByStatus() {
    // Get all possible statuses from the enum to ensure we include zeros
    const allStatuses = Object.values(await this.prisma.$queryRaw<{status: string}[]>`
      SELECT unnest(enum_range(NULL::"OfferStatus")) as status
    `).map(s => s.status);

    // Get counts for each status
    const statusCounts = await this.prisma.budgetaryOffer.groupBy({
      by: ['status'],
      _count: true
    });

    // Create a map of status to count
    const countMap = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    // Map all statuses including those with zero count
    return allStatuses.map(status => ({
      name: status,
      value: countMap[status] || 0,
      color: this.getStatusColor(status)
    }));
  }

  async getDispatchDueMetrics() {
    const currentDate = new Date();
    const next7Days = addDays(currentDate, 7);
    const next14Days = addDays(currentDate, 14);
    const next30Days = addDays(currentDate, 30);

    // Get LOAs whose dispatch is due in next 7 days, 7-14 days, and 14-30 days
    const [dueIn7Days, dueIn7to14Days, dueIn14to30Days] = await Promise.all([
      // Due in next 7 days
      this.prisma.lOA.count({
        where: {
          dueDate: {
            gte: currentDate,
            lte: next7Days
          },
          status: {
            not: 'CLOSED'
          }
        }
      }),
      // Due in 7-14 days
      this.prisma.lOA.count({
        where: {
          dueDate: {
            gt: next7Days,
            lte: next14Days
          },
          status: {
            not: 'CLOSED'
          }
        }
      }),
      // Due in 14-30 days
      this.prisma.lOA.count({
        where: {
          dueDate: {
            gt: next14Days,
            lte: next30Days
          },
          status: {
            not: 'CLOSED'
          }
        }
      })
    ]);

    return {
      dueIn7Days,
      dueIn7to14Days,
      dueIn14to30Days
    };
  }

  async getProcessingTimeMetrics() {
    // Get average processing time for LOAs (from createdAt to orderReceivedDate for CLOSED status)
    const loaProcessingTime = await this.prisma.lOA.findMany({
      where: {
        status: 'CLOSED',
        orderReceivedDate: {
          not: null
        }
      },
      select: {
        createdAt: true,
        orderReceivedDate: true,
        dueDate: true
      }
    });

    // Calculate average processing time and comparison to due date
    let totalProcessingDays = 0;
    let totalDaysAheadBehind = 0;
    let onTimeCount = 0;
    let lateCount = 0;
    let earlyCount = 0;
    let processedCount = 0;

    loaProcessingTime.forEach(loa => {
      if (loa.orderReceivedDate) {
        // Processing time: from creation to closure
        const processingDays = differenceInDays(loa.orderReceivedDate, loa.createdAt);
        totalProcessingDays += processingDays;

        // Compare to due date if available
        if (loa.dueDate) {
          const daysFromDue = differenceInDays(loa.orderReceivedDate, loa.dueDate);
          totalDaysAheadBehind += daysFromDue;

          if (daysFromDue < 0) {
            earlyCount++; // Closed before due date (negative = early)
          } else if (daysFromDue === 0) {
            onTimeCount++; // Closed on due date
          } else {
            lateCount++; // Closed after due date
          }
        }

        processedCount++;
      }
    });

    const avgProcessingTime = processedCount > 0 ? totalProcessingDays / processedCount : 0;
    const avgDaysFromDue = processedCount > 0 ? totalDaysAheadBehind / processedCount : 0;

    // Calculate percentage metrics
    const totalWithDueDate = earlyCount + onTimeCount + lateCount;
    const onTimePercentage = totalWithDueDate > 0 ? ((earlyCount + onTimeCount) / totalWithDueDate) * 100 : 0;

    return {
      avgProcessingTime: Math.round(avgProcessingTime * 10) / 10, // Round to 1 decimal
      avgDaysFromDue: Math.round(avgDaysFromDue * 10) / 10, // Positive = late, Negative = early
      onTimePercentage: Math.round(onTimePercentage),
      earlyCount,
      onTimeCount,
      lateCount,
      totalProcessed: processedCount
    };
  }
}