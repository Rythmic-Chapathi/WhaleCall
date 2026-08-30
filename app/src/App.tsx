import { Route, Switch } from "wouter";
import LandingPage from "@/pages/Landing";
import BookingPage from "@/pages/Booking";
import SuppliesPage from "@/pages/Supplies";
import TripPage from "@/pages/Trip";
import ReceiptPage from "@/pages/Receipt";
import FleetPage from "@/pages/Fleet";
import IslandPage from "@/pages/IslandPage";
import EmergencyPage from "@/pages/Emergency";
import EmergencyTrackingPage from "@/pages/EmergencyTracking";
import DispatchPage from "@/pages/Dispatch";
import ProfilePage from "@/pages/Profile";
import DriverApplyPage from "@/pages/DriverApply";
import DriverApplicationsPage from "@/pages/DriverApplications";
import DriverProfilePage from "@/pages/DriverProfile";
import AuthPage from "@/pages/Auth";
import NotFoundPage from "@/pages/NotFound";

/**
 * Navigation is immediate. There is no artificial delay and no interstitial
 * overlay between routes -- a fast app should feel fast.
 */
export default function App() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/book" component={BookingPage} />
      <Route path="/supplies" component={SuppliesPage} />
      <Route path="/trip/:id" component={TripPage} />
      <Route path="/receipt/:id" component={ReceiptPage} />
      <Route path="/fleet" component={FleetPage} />
      <Route path="/islands/:id" component={IslandPage} />
      <Route path="/emergency" component={EmergencyPage} />
      <Route path="/emergency/:id" component={EmergencyTrackingPage} />
      <Route path="/dispatch" component={DispatchPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/drivers/apply" component={DriverApplyPage} />
      <Route path="/drivers/applications" component={DriverApplicationsPage} />
      <Route path="/drivers/:id" component={DriverProfilePage} />
      <Route path="/sign-in" component={AuthPage} />
      <Route path="/sign-up" component={AuthPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
