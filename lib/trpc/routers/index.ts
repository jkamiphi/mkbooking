import { router } from "../init";
import { userProfileRouter } from "./user-profile";
import { organizationRouter } from "./organization";
import { adminRouter } from "./admin";
import { inventoryRouter } from "./inventory";
import { catalogRouter } from "./catalog";
import { ordersRouter } from "./orders";
import { designRouter } from "./design";
import { printRouter } from "./print";
import { notificationsRouter } from "./notifications";

export const appRouter = router({
  userProfile: userProfileRouter,
  organization: organizationRouter,
  admin: adminRouter,
  inventory: inventoryRouter,
  catalog: catalogRouter,
  orders: ordersRouter,
  design: designRouter,
  print: printRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
