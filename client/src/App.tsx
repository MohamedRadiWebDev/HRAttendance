import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Attendance from "@/pages/Attendance";
import Import from "@/pages/Import";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/import" component={Import} />
      <Route path="/rules" component={() => <div className="p-8 text-center text-xl text-muted-foreground">صفحة القواعد (قيد التطوير)</div>} />
      <Route path="/templates" component={() => <div className="p-8 text-center text-xl text-muted-foreground">صفحة النماذج (قيد التطوير)</div>} />
      <Route path="/adjustments" component={() => <div className="p-8 text-center text-xl text-muted-foreground">صفحة التسويات (قيد التطوير)</div>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
