import { router } from "../init";
import { userProfileRouter } from "./user-profile";
import { organizationRouter } from "./organization";
import { adminRouter } from "./admin";

export const appRouter = router({
  userProfile: userProfileRouter,
  organization: organizationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
