import { router } from "../init";
import { userProfileRouter } from "./user-profile";
import { organizationRouter } from "./organization";
import { adminRouter } from "./admin";
import { inventoryRouter } from "./inventory";
import { catalogRouter } from "./catalog";

export const appRouter = router({
  userProfile: userProfileRouter,
  organization: organizationRouter,
  admin: adminRouter,
  inventory: inventoryRouter,
  catalog: catalogRouter,
});

export type AppRouter = typeof appRouter;
