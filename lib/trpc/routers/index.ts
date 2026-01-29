import { router } from "../init";
import { userProfileRouter } from "./user-profile";
import { organizationRouter } from "./organization";

export const appRouter = router({
  userProfile: userProfileRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
