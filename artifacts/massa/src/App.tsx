import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Workspace } from "@/pages/Workspace";
import { Overview } from "@/pages/Overview";
import { PROJECTS } from "@/data/mock";

const queryClient = new QueryClient();

function WorkspaceRoute({ projectId }: { projectId: string }) {
  const isValid = PROJECTS.some((p) => p.id === projectId);
  if (!isValid) return <Redirect to="/" />;
  return <Workspace initialProjectId={projectId} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/workspace/:projectId">
        {(params) => <WorkspaceRoute projectId={params.projectId} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
