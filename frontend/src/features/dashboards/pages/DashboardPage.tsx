import { useState } from 'react';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { LoadingSpinner } from '../../../components/feedback/LoadingSpinner';
import { Button } from "../../../components/ui/button";
import {
  FileText,
  ShoppingCart,
  AlertTriangle,
  Bell,
  Package,
  Clock,
  ArrowUpRight,
  AreaChart,
  Building,
  Tag,
  FileCheck,
  Calendar,
  TrendingUp,
  Timer
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Progress } from "../../../components/ui/progress";
// import '../dashboard.css';

export function DashboardPage() {
  const { loading, error, stats, activities, trends, offersByStatus, dispatchMetrics, processingMetrics } = useDashboardData();
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();

  // Quick actions to navigate around the system
  const quickActions = [
    { label: "New Offer", icon: FileText, path: "/budgetary-offers/new", color: "text-blue-600 bg-blue-100" },
    { label: "New PO", icon: ShoppingCart, path: "/purchase-orders/new", color: "text-emerald-600 bg-emerald-100" },
    { label: "New LOA", icon: FileCheck, path: "/loas/new", color: "text-violet-600 bg-violet-100" },
    { label: "New Site", icon: Package, path: "/sites/new", color: "text-amber-600 bg-amber-100" },
    { label: "New Vendor", icon: Building, path: "/vendors/new", color: "text-pink-600 bg-pink-100" },
    { label: "New Item", icon: Tag, path: "/items/new", color: "text-cyan-600 bg-cyan-100" },
    { label: "New Tender", icon: FileText, path: "/tenders/new", color: "text-indigo-600 bg-indigo-100" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Create chart data for offer statuses
  const offerStatusData = offersByStatus || [];


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your procurement dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            <Clock className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 md:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Dispatch Due Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Due in 7 Days</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{dispatchMetrics?.dueIn7Days ?? 0}</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-red-100">
                    <Calendar className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">PO/LoA dispatch deadline</p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Due in 7-14 Days</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{dispatchMetrics?.dueIn7to14Days ?? 0}</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-amber-100">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">PO/LoA dispatch deadline</p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Due in 14-30 Days</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{dispatchMetrics?.dueIn14to30Days ?? 0}</p>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-emerald-100">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground">PO/LoA dispatch deadline</p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Processing Time</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{processingMetrics?.avgProcessingTime ?? 0}d</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        (processingMetrics?.avgDaysFromDue ?? 0) <= 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {(processingMetrics?.avgDaysFromDue ?? 0) > 0 ? '+' : ''}{processingMetrics?.avgDaysFromDue ?? 0}d
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-violet-100">
                    <Timer className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={processingMetrics?.onTimePercentage ?? 0} className="h-1" />
                  <p className="text-xs text-muted-foreground mt-2">{processingMetrics?.onTimePercentage ?? 0}% on-time or early</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key stats row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Budgetary Offers</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{stats?.totalOffers}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(stats?.offersTrend || 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {(stats?.offersTrend || 0) >= 0 ? '+' : ''}{stats?.offersTrend ?? 0}%
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={75} className="h-1" />
                  <p className="mt-2 text-xs text-muted-foreground">vs previous month</p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Purchase Orders</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{stats?.totalOrders}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(stats?.ordersTrend || 0) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {(stats?.ordersTrend || 0) >= 0 ? '+' : ''}{stats?.ordersTrend ?? 0}%
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-emerald-100">
                    <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={68} className="h-1" />
                  <p className="mt-2 text-xs text-muted-foreground">vs previous month</p>
                </div>
              </CardContent>
            </Card>

            <Card className="stats-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Processing Time</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold">{stats?.processingTime}d</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(stats?.processingTimeTrend || 0) <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {(stats?.processingTimeTrend || 0) <= 0 ? '' : '+'}{stats?.processingTimeTrend ?? 0}%
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={60} className="h-1" />
                  <p className="mt-2 text-xs text-muted-foreground">Average order processing time</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Procurement Trends Chart */}
              <Card className="stats-card">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Procurement Trends</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        Offers
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        Orders
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={{ stroke: "hsl(var(--border))" }}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          axisLine={{ stroke: "hsl(var(--border))" }}
                          tickLine={{ stroke: "hsl(var(--border))" }}
                          tickCount={5}
                          allowDecimals={false}
                          domain={[0, 'dataMax + 1']}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "var(--radius)",
                            boxShadow: "var(--shadow)"
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: "5px" }}
                          formatter={(value, name) => {
                            const formattedValue = typeof value === 'number' ? value.toString() : '0';
                            const formattedName = name === "offers" ? "Offers" : name === "orders" ? "Orders" : name;
                            return [formattedValue, formattedName];
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="offers"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ fill: "#3b82f6", r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 7, strokeWidth: 0 }}
                          name="Offers"
                          fillOpacity={1}
                          fill="url(#colorOffers)"
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ fill: "#10b981", r: 4, strokeWidth: 2 }}
                          activeDot={{ r: 7, strokeWidth: 0 }}
                          name="Orders"
                          fillOpacity={1}
                          fill="url(#colorOrders)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                  <div className="rounded-full bg-slate-100 p-1.5">
                    <Bell className="h-4 w-4 text-slate-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div className="text-muted-foreground mb-2">No recent activity</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activities.slice(0, 5).map((activity) => (
                        <div 
                          key={activity.id} 
                          className="flex items-start p-3 hover:bg-muted/50 rounded-md transition-colors border border-border/40"
                        >
                          <div className={`p-2 rounded-full mr-3 ${
                            activity.type === 'offer' ? 'bg-blue-100' : 'bg-emerald-100'
                          }`}>
                            <div className={`h-5 w-5 ${
                              activity.type === 'offer' ? 'text-blue-600' : 'text-emerald-600'
                            }`}>
                              {activity.type === 'offer' && <FileText className="h-5 w-5" />}
                              {activity.type === 'po' && <ShoppingCart className="h-5 w-5" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium truncate">{activity.title}</p>
                              <div className={`text-xs px-2 py-0.5 rounded-full ml-2 whitespace-nowrap ${
                                activity.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 
                                activity.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 
                                activity.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {activity.status}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">{activity.description}</p>
                            <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                              <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
                              {activity.createdBy && <span>By: {activity.createdBy}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4 pb-3">
                  <div className="w-full flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/activities')}>
                      View All
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="stats-card bg-gradient-to-br from-slate-50 to-white border shadow-sm">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start h-12 group hover:border-primary/20 hover:bg-primary/5 transition-colors hover:text-foreground"
                      onClick={() => navigate(action.path)}
                    >
                      <div className={`p-1.5 rounded-lg mr-3 ${action.color}`}>
                        <action.icon className="h-4 w-4" />
                      </div>
                      <span className="text-foreground">{action.label}</span>
                      <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Offers by Status */}
              <Card className="stats-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold">Offers by Status</CardTitle>
                  <div className="rounded-full bg-blue-50 p-1.5">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  {offerStatusData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px]">
                      <div className="text-muted-foreground mb-2">No data available</div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => navigate('/budgetary-offers/new')}
                      >
                        Create new offer
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="h-[180px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={offerStatusData.filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={70}
                              paddingAngle={3}
                              dataKey="value"
                              cornerRadius={4}
                              startAngle={90}
                              endAngle={-270}
                            >
                              {offerStatusData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                  stroke="hsl(var(--card))"
                                  strokeWidth={1}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [`${parseInt(String(value))}`, name]}
                              contentStyle={{ 
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                                padding: "8px",
                                boxShadow: "var(--shadow-sm)"
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {offerStatusData.map((status, index) => {
                          const total = offerStatusData.reduce((sum, item) => sum + item.value, 0);
                          const percentage = total > 0 ? Math.round((status.value / total) * 100) : 0;
                          
                          return (
                            <div key={index} className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                                <span className="text-sm font-medium">{status.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{status.value}</span>
                                <span className="text-xs text-muted-foreground">({percentage}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
                <CardFooter className="border-t pt-4 pb-3">
                  <div className="w-full flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(), { addSuffix: true })}
                    </span>
                    <span className="text-sm font-medium">
                      Total: {offerStatusData.reduce((sum, item) => sum + item.value, 0)}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="stats-card p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Procurement Performance Dashboard</CardTitle>
              <CardDescription>
                Detailed metrics and KPIs for procurement performance
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-4">
              <div className="text-center">
                <AreaChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Coming soon!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This detailed performance dashboard is under development
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="stats-card p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Documents Dashboard</CardTitle>
              <CardDescription>
                Document tracking and management
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 py-4">
              <div className="text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Coming soon!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The documents dashboard is under development
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}