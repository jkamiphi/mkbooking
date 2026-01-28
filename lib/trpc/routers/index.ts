import { router } from "../init";
import { userProfileRouter } from "./user-profile";

export const appRouter = router({
  userProfile: userProfileRouter,
});

export type AppRouter = typeof appRouter;
