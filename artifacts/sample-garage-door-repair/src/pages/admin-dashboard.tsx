import { useGetGarageDashboard, useUpdateServiceRequest, useListServiceRequests, getGetGarageDashboardQueryKey, getListServiceRequestsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { LayoutDashboard, Settings, AlertTriangle, CheckCircle2, Clock, Calendar, Search, ArrowRight, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServiceRequestUpdateStatus } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminDashboardPage() {
  const { data: dashboard, isLoading } = useGetGarageDashboard();
  const { data: allRequests } = useListServiceRequests();
  const updateRequest = useUpdateServiceRequest();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const requests = allRequests || dashboard?.requests || [];
  
  const filteredRequests = requests.filter(req => 
    req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.zip.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'scheduled': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'dispatched': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'soon': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'flexible': return <Calendar className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const handleStatusChange = (id: number, newStatus: ServiceRequestUpdateStatus) => {
    updateRequest.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGarageDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListServiceRequestsQueryKey() });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-muted/10">
      
      <main className="flex-1 p-4 sm:p-6 lg:p-8 container mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Operations Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage dispatch, crews, and active jobs.</p>
          </div>
          <div className="flex items-center gap-2">
             <Button asChild variant="outline" className="gap-2">
               <Link href="/admin/settings"><Settings className="h-4 w-4"/> Business Settings</Link>
             </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Requests</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.newRequests || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-balance">Awaiting assignment</p>
            </CardContent>
          </Card>
          <Card className={dashboard?.emergencyCalls ? 'border-destructive/50 bg-destructive/5' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${dashboard?.emergencyCalls ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>Active Emergencies</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${dashboard?.emergencyCalls ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${dashboard?.emergencyCalls ? 'text-destructive' : ''}`}>{dashboard?.emergencyCalls || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-balance">Requires immediate action</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.scheduledToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-balance">Active truck routes</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Est. Pipeline Rev</CardTitle>
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${dashboard?.estimatedRevenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1 text-balance">Based on base prices</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b">
            <div>
              <CardTitle className="font-display">Active Service Requests</CardTitle>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers, zips..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px] w-full">
              {filteredRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                   <LayoutDashboard className="h-12 w-12 text-muted-foreground/30 mb-4" />
                   <p className="text-lg font-medium text-muted-foreground">No requests found</p>
                   <p className="text-sm text-muted-foreground/70">Adjust your search or wait for new leads.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRequests.map((req) => (
                    <div key={req.id} className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6 hover:bg-muted/50 transition-colors">
                      
                      {/* Left: Customer Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getUrgencyIcon(req.urgency)}
                            <h3 className="font-bold text-lg">{req.customerName}</h3>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center gap-2"><User className="h-3 w-3" /> {req.phone}</p>
                            <p>{req.email}</p>
                            <p>ZIP: <span className="font-medium">{req.zip}</span></p>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-semibold mb-1 text-sm uppercase tracking-wider text-muted-foreground">Service Required</p>
                          <p className="font-medium">{req.service}</p>
                          <p className="text-sm text-muted-foreground mt-1 bg-background p-2 border rounded-md line-clamp-2">
                            {req.details || "No additional details provided."}
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">
                             Requested: {format(new Date(req.createdAt), 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="lg:w-64 flex flex-col justify-between gap-4 lg:border-l lg:pl-6">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                          <Select 
                            value={req.status} 
                            onValueChange={(val) => handleStatusChange(req.id, val as ServiceRequestUpdateStatus)}
                          >
                            <SelectTrigger className={`w-full font-medium ${getStatusColor(req.status)} border-transparent`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New / Unassigned</SelectItem>
                              <SelectItem value="scheduled">Scheduled</SelectItem>
                              <SelectItem value="dispatched">Dispatched</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <Button variant="outline" size="sm" className="w-full text-xs">
                           View Full Details <ArrowRight className="ml-2 h-3 w-3" />
                        </Button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
