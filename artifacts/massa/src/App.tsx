import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TenantProvider } from "@/contexts/TenantContext";
import NotFound from "@/pages/not-found";
import { Workspace } from "@/pages/Workspace";
import { Overview } from "@/pages/Overview";
import { InsideMassa } from "@/pages/InsideMassa";
import { ImageGenerator } from "@/pages/ImageGenerator";
import { VideoGenerator } from "@/pages/VideoGenerator";
import { FigmaIntegration } from "@/pages/FigmaIntegration";
import { QuickCapture } from "@/pages/QuickCapture";
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
      <Route path="/inside" component={InsideMassa} />
      <Route path="/image-generator" component={ImageGenerator} />
      <Route path="/video-generator" component={VideoGenerator} />
      <Route path="/figma" component={FigmaIntegration} />
      <Route path="/quick" component={QuickCapture} />
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
        <TenantProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TenantProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
